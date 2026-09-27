import type { SavedAudioSource } from "@/domain/project/audio-source";
import { keepsYouTubeAudio } from "@/domain/storage/audio-retention";
import type { ProjectSaveArgs } from "@/lib/persistence";
import { type AudioSource, useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { useSeparationStore } from "@/stores/separation";
import { useSettingsStore } from "@/stores/settings";

// -- Audio --------------------------------------------------------------------

function toSavedAudioSource(source: AudioSource): SavedAudioSource | undefined {
  if (!source) return undefined;
  if (source.type === "file") return { kind: "file", name: source.file.name };
  if (source.type === "youtube") return { kind: "youtube", videoId: source.videoId };
  return undefined;
}

function playableFile(source: AudioSource): File | null {
  if (!source) return null;
  if (source.type === "file") return source.file;
  if (source.type === "youtube") return source.file ?? null;
  return null;
}

function storedAudioFile(source: AudioSource): File | null {
  if (source?.type !== "youtube") return playableFile(source);
  const settings = useSettingsStore.getState();
  return keepsYouTubeAudio(settings.keepYouTubeAudio, settings.experiments.youtubeBridge) ? playableFile(source) : null;
}

// -- Save arguments -----------------------------------------------------------

function currentSaveArgs(): ProjectSaveArgs {
  const projectState = useProjectStore.getState();
  return [
    projectState.metadata,
    projectState.agents,
    projectState.lines,
    projectState.groups,
    projectState.granularity,
    projectState.syllableSplitDefaults,
    toSavedAudioSource(useAudioStore.getState().source),
    projectState.dismissedSuggestions,
    projectState.dismissedExplicitSuggestions,
    useSeparationStore.getState().currentStem,
    projectState.primingStripped,
    projectState.customSnapPoints,
    projectState.hasUnexportedImport,
  ];
}

function buildSaveArgs(): ProjectSaveArgs | null {
  const projectState = useProjectStore.getState();
  // An audio-only session still saves: the stem and the audio source kind must survive a reload.
  const hasContent = projectState.lines.length > 0 || projectState.metadata.title;
  if (!hasContent && useAudioStore.getState().source === null) return null;
  return currentSaveArgs();
}

// -- Exports ------------------------------------------------------------------

export { storedAudioFile, buildSaveArgs, currentSaveArgs };
