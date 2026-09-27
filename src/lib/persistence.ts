import type { Stem } from "@/audio/separation/types";
import type { Agent } from "@/domain/agent/model";
import type { LinkGroup } from "@/domain/group/template";
import type { LyricLine } from "@/domain/line/model";
import type { SavedAudioSource } from "@/domain/project/audio-source";
import type { ProjectMetadata } from "@/domain/project/metadata";
import type { SnapPoint } from "@/domain/snap-point/model";
import { ensureOpenProjectId, findOpenProjectId } from "@/lib/open-project-session";
import { deleteProjectAudio, saveProjectAudio, saveProjectRecord } from "@/lib/project-repository";
import { SAVED_PROJECT_VERSION, type SavedProject, upgradeSavedProject } from "@/lib/saved-project";
import type { GranularityMode } from "@/stores/project";
import { DEFAULT_SYLLABLE_SPLIT_DEFAULTS, type SyllableSplitDefaults } from "@/stores/project/types";

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

// -- Project Files ------------------------------------------------------------

function exportProjectToFile(
  metadata: ProjectMetadata,
  agents: Agent[],
  lines: LyricLine[],
  groups: LinkGroup[],
  granularity: GranularityMode,
  syllableSplitDefaults: SyllableSplitDefaults,
  dismissedSuggestions: string[],
  dismissedExplicitSuggestions: string[],
  customSnapPoints: SnapPoint[],
  audioFileName?: string,
): void {
  const project: SavedProject = {
    version: SAVED_PROJECT_VERSION,
    savedAt: Date.now(),
    metadata,
    agents,
    lines,
    groups,
    granularity,
    syllableSplitDefaults,
    audioFileName,
    dismissedSuggestions,
    dismissedExplicitSuggestions,
    customSnapPoints,
  };

  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${metadata.title || "project"}-${new Date().toISOString().slice(0, 10)}.ttml-project.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function importProjectFromFile(file: File): Promise<SavedProject> {
  const text = await file.text();
  const project = JSON.parse(text) as SavedProject;

  if (project.version !== 1 && project.version !== 2 && project.version !== 3) {
    throw new Error(`Unsupported project version: ${project.version}`);
  }

  if (!project.syllableSplitDefaults) {
    project.syllableSplitDefaults = DEFAULT_SYLLABLE_SPLIT_DEFAULTS;
  }
  upgradeSavedProject(project);

  return project;
}

// -- Exports ------------------------------------------------------------------

export {
  buildSavedProject,
  saveProjectTo,
  saveCurrentProject,
  exportProjectToFile,
  importProjectFromFile,
  saveAudioFile,
  clearAudioFile,
};
export type { ProjectSaveArgs };
