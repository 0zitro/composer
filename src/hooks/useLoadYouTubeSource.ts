import { useCallback } from "react";
import { shallow } from "zustand/shallow";
import { hasLyricLines } from "@/domain/project/lyrics-presence";
import type { ProjectMetadata } from "@/domain/project/metadata";
import { confirmClearImportedSongDetails } from "@/hooks/imported-song-details";
import { createProject, deleteProject, openProject } from "@/lib/open-project";
import { openProjectIdSnapshot } from "@/lib/open-project-session";
import { type AudioSource, useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { quotedTitle, showNewProjectToast } from "@/utils/project-toast";

// -- Hook ---------------------------------------------------------------------

function useLoadYouTubeSource(): (videoId: string) => Promise<void> {
  return useCallback((videoId: string) => {
    const audio = useAudioStore.getState();
    const previous = audio.source;
    const prevVideoId = previous?.type === "youtube" ? previous.videoId : null;
    if (previous != null && prevVideoId !== videoId && hasLyricLines(useProjectStore.getState().lines)) {
      return loadVideoInNewProject(videoId);
    }
    audio.setYouTubeSource(videoId);

    const project = useProjectStore.getState();
    if (previous == null || prevVideoId === videoId) {
      if (!project.metadata.title || prevVideoId !== videoId) project.setMetadata({ title: videoId });
      project.clearUnexportedImport();
      return waitForYouTubeLoad(videoId);
    }

    const loading = waitForYouTubeLoad(videoId);
    let undoReset: (() => void) | null = null;
    if (!project.hasUnexportedImport) {
      undoReset = resetSongIdentityForVideo(videoId, previous);
    } else {
      void confirmClearImportedSongDetails().then((clear) => {
        if (!matchesPending(useAudioStore.getState().source, videoId)) return;
        if (clear) undoReset = resetSongIdentityForVideo(videoId, previous);
        else useProjectStore.getState().clearUnexportedImport();
      });
    }
    return loading.catch((error: unknown) => {
      undoReset?.();
      throw error;
    });
  }, []);
}

function resetSongIdentityForVideo(videoId: string, previous: AudioSource): () => void {
  const project = useProjectStore.getState();
  const { metadata, agents, hasUnexportedImport } = project;
  project.resetSongIdentity(videoId);
  const resetState = useProjectStore.getState();
  return () => {
    const current = useProjectStore.getState();
    const loadFellBackToPrevious = useAudioStore.getState().source === previous;
    const untouchedSinceReset =
      current.agents === resetState.agents &&
      shallow(withoutThumbnailOf(current.metadata, videoId), resetState.metadata);
    if (loadFellBackToPrevious && untouchedSinceReset) {
      current.restoreSongIdentity({ metadata, agents, hasUnexportedImport });
    }
  };
}

function abandonsNewProject(newId: string, videoId: string): boolean {
  return (
    openProjectIdSnapshot() === newId &&
    matchesPending(useAudioStore.getState().source, videoId) &&
    !hasLyricLines(useProjectStore.getState().lines)
  );
}

async function loadVideoInNewProject(videoId: string): Promise<void> {
  const previousId = openProjectIdSnapshot();
  const previousTitle = useProjectStore.getState().metadata.title;
  const newId = createProject();
  useAudioStore.getState().setYouTubeSource(videoId);
  useProjectStore.getState().setMetadata({ title: videoId });
  try {
    await waitForYouTubeLoad(videoId);
  } catch (error) {
    if (previousId && abandonsNewProject(newId, videoId)) {
      await openProject(previousId);
      await deleteProject(newId);
    }
    throw error;
  }
  if (previousId) {
    showNewProjectToast(
      `Opened ${quotedTitle(useProjectStore.getState().metadata.title)} in a new project`,
      `${quotedTitle(previousTitle)} is still in Projects.`,
      previousId,
    );
  }
}

function withoutThumbnailOf(metadata: ProjectMetadata, videoId: string): ProjectMetadata {
  if (metadata.thumbnailForVideoId !== videoId) return metadata;
  return { ...metadata, thumbnailDataUrl: undefined, thumbnailForVideoId: undefined };
}

function waitForYouTubeLoad(videoId: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const unsubscribe = useAudioStore.subscribe((state) => {
      if (matchesLoaded(state.source, videoId)) {
        unsubscribe();
        resolve();
        return;
      }
      if (state.youtubeLoadError) {
        unsubscribe();
        reject(new Error(state.youtubeLoadError));
        return;
      }
      if (!matchesPending(state.source, videoId)) {
        unsubscribe();
        reject(new Error("youtube_load_superseded"));
      }
    });
  });
}

function matchesLoaded(source: ReturnType<typeof useAudioStore.getState>["source"], videoId: string): boolean {
  return source?.type === "youtube" && source.videoId === videoId && source.file != null;
}

function matchesPending(source: ReturnType<typeof useAudioStore.getState>["source"], videoId: string): boolean {
  return source?.type === "youtube" && source.videoId === videoId;
}

// -- Exports ------------------------------------------------------------------

export { useLoadYouTubeSource };
