import type { Stem } from "@/audio/separation/types";
import type { Agent } from "@/domain/agent/model";
import type { LinkGroup } from "@/domain/group/template";
import type { LyricLine } from "@/domain/line/model";
import type { SavedAudioSource } from "@/domain/project/audio-source";
import type { ProjectMetadata } from "@/domain/project/metadata";
import type { SnapPoint } from "@/domain/snap-point/model";
import { ensureOpenProjectId, findOpenProjectId } from "@/lib/open-project-session";
import { deleteProjectAudio, saveProjectAudio, saveProjectRecord } from "@/lib/project-repository";
import { SAVED_PROJECT_VERSION, type SavedProject } from "@/lib/saved-project";
import type { GranularityMode } from "@/stores/project";
import type { SyllableSplitDefaults } from "@/stores/project/types";

// -- Records ------------------------------------------------------------------

function buildSavedProject(
  metadata: ProjectMetadata,
  agents: Agent[],
  lines: LyricLine[],
  groups: LinkGroup[],
  granularity: GranularityMode,
  syllableSplitDefaults: SyllableSplitDefaults,
  audioSource: SavedAudioSource | undefined,
  dismissedSuggestions: string[],
  dismissedExplicitSuggestions: string[],
  currentStem: Stem,
  primingStripped: boolean,
  customSnapPoints: SnapPoint[],
  hasUnexportedImport = false,
): SavedProject {
  return {
    version: SAVED_PROJECT_VERSION,
    savedAt: Date.now(),
    metadata,
    agents,
    lines,
    groups,
    granularity,
    syllableSplitDefaults,
    audioFileName: audioSource?.kind === "file" ? audioSource.name : undefined,
    audioSource,
    dismissedSuggestions,
    dismissedExplicitSuggestions,
    currentStem,
    primingStripped,
    customSnapPoints,
    hasUnexportedImport,
  };
}

type ProjectSaveArgs = Parameters<typeof buildSavedProject>;

async function saveProjectTo(target: Promise<string>, ...args: ProjectSaveArgs): Promise<void> {
  const project = buildSavedProject(...args);
  await saveProjectRecord(await target, project);
}

// -- Public API ---------------------------------------------------------------

function saveCurrentProject(...args: ProjectSaveArgs): Promise<void> {
  return saveProjectTo(ensureOpenProjectId(), ...args);
}

// -- Audio File Persistence ---------------------------------------------------

async function saveAudioFile(file: File): Promise<void> {
  await saveProjectAudio(await ensureOpenProjectId(), file);
}

async function clearAudioFile(): Promise<void> {
  const id = await findOpenProjectId();
  if (id) await deleteProjectAudio(id);
}

// -- Exports ------------------------------------------------------------------

export { buildSavedProject, saveProjectTo, saveCurrentProject, saveAudioFile, clearAudioFile };
export type { ProjectSaveArgs };
