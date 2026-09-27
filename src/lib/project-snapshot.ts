import type { SavedAudioSource } from "@/domain/project/audio-source";
import type { ProjectSaveArgs } from "@/lib/persistence";
import { type AudioSource, useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { useSeparationStore } from "@/stores/separation";

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

// -- Save arguments -----------------------------------------------------------

function buildSaveArgs(): ProjectSaveArgs | null {
  const projectState = useProjectStore.getState();
  const liveAudioSource = useAudioStore.getState().source;
  // An audio-only session still saves: the stem and the audio source kind must survive a reload.
  const hasContent = projectState.lines.length > 0 || projectState.metadata.title;
  if (!hasContent && liveAudioSource === null) return null;
  return [
    projectState.metadata,
    projectState.agents,
    projectState.lines,
    projectState.groups,
    projectState.granularity,
    projectState.syllableSplitDefaults,
    toSavedAudioSource(liveAudioSource),
    projectState.dismissedSuggestions,
    projectState.dismissedExplicitSuggestions,
    useSeparationStore.getState().currentStem,
    projectState.primingStripped,
    projectState.customSnapPoints,
    projectState.hasUnexportedImport,
  ];
}

// -- Exports ------------------------------------------------------------------

export { playableFile, buildSaveArgs };
