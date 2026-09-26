import type { Stem } from "@/audio/separation/types";
import type { Agent } from "@/domain/agent/model";
import type { LinkGroup } from "@/domain/group/template";
import type { LyricLine } from "@/domain/line/model";
import type { SavedAudioSource } from "@/domain/project/audio-source";
import type { ProjectMetadata } from "@/domain/project/metadata";
import type { SnapPoint } from "@/domain/snap-point/model";
import { migrateLegacyProject } from "@/lib/project-migration";
import {
  clearOpenProjectId,
  createProjectId,
  deleteProject,
  deleteProjectAudio,
  loadProjectAudio,
  saveProjectAudio,
  saveProjectRecord,
  setOpenProjectId,
} from "@/lib/project-repository";
import { getOpenProjectId, loadProjectRecord } from "@/lib/project-storage";
import { SAVED_PROJECT_VERSION, type SavedProject, upgradeSavedProject } from "@/lib/saved-project";
import type { GranularityMode } from "@/stores/project";
import { DEFAULT_SYLLABLE_SPLIT_DEFAULTS, type SyllableSplitDefaults } from "@/stores/project/types";

// -- Open project -------------------------------------------------------------

let openProjectIdLookup: Promise<string | undefined> | null = null;
let openProjectIdCreation: Promise<string> | null = null;

function findOpenProjectId(): Promise<string | undefined> {
  openProjectIdLookup ??= getOpenProjectId()
    .then((id) => id ?? migrateLegacyProject())
    .catch((error: unknown) => {
      openProjectIdLookup = null;
      throw error;
    });
  return openProjectIdLookup;
}

function ensureOpenProjectId(): Promise<string> {
  openProjectIdCreation ??= findOpenProjectId()
    .then(async (existing) => {
      if (existing) return existing;
      const id = createProjectId();
      await setOpenProjectId(id);
      openProjectIdLookup = Promise.resolve(id);
      return id;
    })
    .catch((error: unknown) => {
      openProjectIdCreation = null;
      openProjectIdLookup = null;
      throw error;
    });
  return openProjectIdCreation;
}

function __resetOpenProjectForTests(): void {
  openProjectIdLookup = null;
  openProjectIdCreation = null;
}

// -- Public API ---------------------------------------------------------------

async function saveCurrentProject(
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
): Promise<void> {
  const audioFileName = audioSource?.kind === "file" ? audioSource.name : undefined;
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
    audioSource,
    dismissedSuggestions,
    dismissedExplicitSuggestions,
    currentStem,
    primingStripped,
    customSnapPoints,
    hasUnexportedImport,
  };
  await saveProjectRecord(await ensureOpenProjectId(), project);
}

async function loadCurrentProject(): Promise<SavedProject | undefined> {
  const id = await findOpenProjectId();
  if (!id) return undefined;
  const project = await loadProjectRecord(id);
  if (project && upgradeSavedProject(project)) await saveProjectRecord(id, project);
  return project;
}

async function replaceCurrentProject(project: SavedProject): Promise<void> {
  await saveProjectRecord(await ensureOpenProjectId(), project);
}

async function clearCurrentProject(): Promise<void> {
  const id = await findOpenProjectId();
  if (id) await deleteProject(id);
  await clearOpenProjectId();
  __resetOpenProjectForTests();
}

// -- Audio File Persistence ---------------------------------------------------

async function saveAudioFile(file: File): Promise<void> {
  await saveProjectAudio(await ensureOpenProjectId(), file);
}

async function loadAudioFile(): Promise<File | undefined> {
  const id = await findOpenProjectId();
  return id ? loadProjectAudio(id) : undefined;
}

async function clearAudioFile(): Promise<void> {
  const id = await findOpenProjectId();
  if (id) await deleteProjectAudio(id);
}

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
  saveCurrentProject,
  loadCurrentProject,
  replaceCurrentProject,
  clearCurrentProject,
  exportProjectToFile,
  importProjectFromFile,
  saveAudioFile,
  loadAudioFile,
  clearAudioFile,
  __resetOpenProjectForTests,
};
