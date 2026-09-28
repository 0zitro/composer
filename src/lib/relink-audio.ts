import type { SavedAudioSource } from "@/domain/project/audio-source";
import { waitForYouTubeLoad } from "@/hooks/useLoadYouTubeSource";
import { openProjectIdSnapshot } from "@/lib/open-project-session";
import { saveOpenProjectNow } from "@/lib/persistence-debounce";
import { useAudioStore } from "@/stores/audio";
import { useConfirmStore } from "@/stores/confirm-store";

// -- Helpers ------------------------------------------------------------------

function confirmDifferentFile(expected: string, dropped: string): Promise<boolean> {
  return useConfirmStore.getState().open({
    title: "Link a different file?",
    description: `“${dropped}” doesn't match “${expected}”. The timings may not line up if it's a different recording.`,
    confirmLabel: "Link file",
    variant: "primary",
  });
}

function needsConfirmation(expected: SavedAudioSource | null, file: File): expected is { kind: "file"; name: string } {
  return expected?.kind === "file" && expected.name !== file.name;
}

// -- Relinking ----------------------------------------------------------------

async function relinkProjectAudioFile(file: File): Promise<boolean> {
  const projectId = openProjectIdSnapshot();
  const expected = useAudioStore.getState().expectedAudio;
  if (needsConfirmation(expected, file) && !(await confirmDifferentFile(expected.name, file.name))) return false;
  if (openProjectIdSnapshot() !== projectId) return false;
  useAudioStore.getState().setSource({ type: "file", file });
  await saveOpenProjectNow();
  return true;
}

async function relinkProjectVideo(videoId: string): Promise<void> {
  useAudioStore.getState().expectProjectAudio({ kind: "youtube", videoId });
  await Promise.all([saveOpenProjectNow(), waitForYouTubeLoad(videoId)]);
}

function retryProjectAudio(): void {
  const expected = useAudioStore.getState().expectedAudio;
  if (expected?.kind === "youtube") useAudioStore.getState().expectProjectAudio(expected);
}

// -- Exports ------------------------------------------------------------------

export { relinkProjectAudioFile, relinkProjectVideo, retryProjectAudio };
