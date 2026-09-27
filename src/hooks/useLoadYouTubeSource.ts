import { useCallback } from "react";
import { shallow } from "zustand/shallow";
import { hasLyricLines } from "@/domain/project/lyrics-presence";
import type { ProjectMetadata } from "@/domain/project/metadata";
import { confirmClearImportedSongDetails } from "@/hooks/imported-song-details";
import { createProject, deleteProject, openProject } from "@/lib/open-project";
import { ensureOpenProjectId, openProjectIdSnapshot } from "@/lib/open-project-session";
import { type AudioSource, useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { showNewProjectToast } from "@/utils/project-toast";

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[YouTubeSource]";

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

function abandonsNewProject(newId: string, loadError: unknown): boolean {
  return (
    !(loadError instanceof Error && loadError.message === "youtube_load_superseded") &&
    openProjectIdSnapshot() === newId &&
    !hasLyricLines(useProjectStore.getState().lines)
  );
}

async function revertToPreviousProject(previousId: string, newId: string): Promise<void> {
  try {
    await openProject(previousId);
  } catch (error) {
    console.error(LOG_PREFIX, "could not switch back to the previous project", error);
  }
  try {
    await deleteProject(newId);
  } catch (error) {
    console.error(LOG_PREFIX, "could not delete the abandoned project", error);
  }
}

async function loadVideoInNewProject(videoId: string): Promise<void> {
  const previousId = openProjectIdSnapshot() ?? (await ensureOpenProjectId());
  const previousTitle = useProjectStore.getState().metadata.title;
  const newId = createProject();
  useAudioStore.getState().setYouTubeSource(videoId);
  useProjectStore.getState().setMetadata({ title: videoId });
  try {
    await waitForYouTubeLoad(videoId);
  } catch (error) {
    if (abandonsNewProject(newId, error)) {
      await revertToPreviousProject(previousId, newId);
    }
    throw error;
  }
  showNewProjectToast(useProjectStore.getState().metadata.title, previousTitle, previousId);
}

function withoutThumbnailOf(metadata: ProjectMetadata, videoId: string): ProjectMetadata {
  if (metadata.thumbnailForVideoId !== videoId) return metadata;
  return { ...metadata, thumbnailDataUrl: undefined, thumbnailForVideoId: undefined };
}

function waitForYouTubeLoad(videoId: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let evaluationQueued = false;
    const evaluate = (): void => {
      evaluationQueued = false;
      if (settled) return;
      const state = useAudioStore.getState();
      if (matchesLoaded(state.source, videoId)) {
        settled = true;
        unsubscribe();
        resolve();
        return;
      }
      if (state.youtubeLoadError) {
        settled = true;
        unsubscribe();
        reject(new Error(state.youtubeLoadError));
        return;
      }
      if (!matchesPending(state.source, videoId)) {
        settled = true;
        unsubscribe();
        reject(new Error("youtube_load_superseded"));
      }
    };
    // A failed load can revert the source and set the error in two separate synchronous
    // notifications; wait a tick so evaluate reads the settled state, not the midpoint.
    const unsubscribe = useAudioStore.subscribe(() => {
      if (evaluationQueued || settled) return;
      evaluationQueued = true;
      queueMicrotask(evaluate);
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
