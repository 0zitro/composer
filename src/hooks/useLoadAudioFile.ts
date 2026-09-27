import { useCallback } from "react";
import { hasLyricLines } from "@/domain/project/lyrics-presence";
import { confirmClearImportedSongDetails } from "@/hooks/imported-song-details";
import { startSongInNewProject } from "@/lib/open-project";
import { useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { audioTagsToMetadata } from "@/utils/audio-tags";
import { fileIdentityKey } from "@/utils/file-identity";
import { fileNameWithoutExtension } from "@/utils/file-name";
import { showNewProjectToast } from "@/utils/project-toast";

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[Composer]";

// -- Types --------------------------------------------------------------------

type TagWrite = "apply" | "skip";

// -- Helpers ------------------------------------------------------------------

function isActiveFile(file: File): boolean {
  const active = useAudioStore.getState().source;
  return active?.type === "file" && active.file === file;
}

function settleSongDetails(file: File, replacesDifferentSong: boolean, title: string): Promise<TagWrite> {
  const project = useProjectStore.getState();
  if (!replacesDifferentSong) {
    project.setMetadata({ title });
    project.clearUnexportedImport();
    return Promise.resolve("apply");
  }
  if (!project.hasUnexportedImport) {
    project.resetSongIdentity(title);
    return Promise.resolve("apply");
  }
  return confirmClearImportedSongDetails().then((clear) => {
    if (!isActiveFile(file)) return "skip";
    const current = useProjectStore.getState();
    if (clear) {
      current.resetSongIdentity(title);
      return "apply";
    }
    current.clearUnexportedImport();
    return "skip";
  });
}

async function applyAudioTags(file: File): Promise<void> {
  const { parseBlob } = await import("music-metadata");
  const { common } = await parseBlob(file);
  if (!isActiveFile(file)) return;
  const patch = audioTagsToMetadata(common);
  if (Object.keys(patch).length > 0) useProjectStore.getState().setMetadata(patch);
}

function readTagsInBackground(file: File): void {
  void applyAudioTags(file).catch((error) => {
    console.warn(`${LOG_PREFIX} could not read audio tags`, error);
  });
}

function loadFileInPlace(file: File, replacesDifferentSong: boolean, title: string): void {
  useAudioStore.getState().setSource({ type: "file", file });
  void settleSongDetails(file, replacesDifferentSong, title)
    .then((tagWrite) => (tagWrite === "apply" ? applyAudioTags(file) : undefined))
    .catch((error) => {
      console.warn(`${LOG_PREFIX} could not read audio tags`, error);
    });
}

async function startFileInNewProject(file: File, title: string): Promise<void> {
  const started = await startSongInNewProject(title, (song) => {
    useAudioStore.getState().setSource({ type: "file", file });
    return song;
  });
  if (!started) {
    loadFileInPlace(file, true, title);
    return;
  }
  showNewProjectToast(title, started.previousTitle, started.previousId, started.newId);
  readTagsInBackground(file);
}

// -- Hook ---------------------------------------------------------------------

function useLoadAudioFile(): (file: File) => void {
  return useCallback((file: File) => {
    const previous = useAudioStore.getState().source;
    const title = fileNameWithoutExtension(file.name);
    const replacesDifferentSong =
      previous != null && !(previous.type === "file" && fileIdentityKey(previous.file) === fileIdentityKey(file));

    if (replacesDifferentSong && hasLyricLines(useProjectStore.getState().lines)) {
      void startFileInNewProject(file, title);
      return;
    }

    loadFileInPlace(file, replacesDifferentSong, title);
  }, []);
}

// -- Exports ------------------------------------------------------------------

export { useLoadAudioFile };
