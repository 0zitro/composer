import { DEFAULT_AGENTS } from "@/domain/agent/colors";
import { normalizeLoadedMetadata } from "@/domain/project/normalize-metadata";
import { type ProjectTab, isProjectTab } from "@/domain/project/tab";
import { stripLamePriming } from "@/lib/priming-migration";
import { loadProjectAudio, loadProjectIndexEntry, saveProjectRecord } from "@/lib/project-repository";
import { loadProjectRecord } from "@/lib/project-storage";
import { type SavedProject, upgradeSavedProject } from "@/lib/saved-project";
import { useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { DEFAULT_SYLLABLE_SPLIT_DEFAULTS } from "@/stores/project/types";
import { useSeparationStore } from "@/stores/separation";
import { useSettingsStore } from "@/stores/settings";
import { useTimelineStore } from "@/views/timeline/timeline-store";

// -- Types --------------------------------------------------------------------

interface RestorePayload {
  project: SavedProject | undefined;
  audio: File | undefined;
  lastTab: ProjectTab | undefined;
}

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[ProjectRestore]";
const EMPTY_RESTORE: RestorePayload = { project: undefined, audio: undefined, lastTab: undefined };

// -- Module state -------------------------------------------------------------

let restoring = false;

// -- Loading ------------------------------------------------------------------

async function loadProjectForRestore(id: string): Promise<RestorePayload> {
  const [project, audio, entry] = await Promise.all([
    loadProjectRecord(id),
    loadProjectAudio(id),
    loadProjectIndexEntry(id),
  ]);
  if (project) {
    const upgraded = upgradeSavedProject(project);
    const primingStripped = await stripLamePriming(project, audio);
    if (upgraded || primingStripped) await saveProjectRecord(id, project);
  }
  return { project, audio, lastTab: isProjectTab(entry?.lastTab) ? entry.lastTab : undefined };
}

function hasStoredProject(payload: RestorePayload): boolean {
  return payload.project !== undefined;
}

function hasRestorableContent(payload: RestorePayload): boolean {
  return payload.project !== undefined || payload.audio !== undefined;
}

// -- Applying -----------------------------------------------------------------

function resetProjectScopedStores(): void {
  useProjectStore.getState().reset();
  useAudioStore.getState().setSource(null);
  useSeparationStore.getState().reset();
  useTimelineStore.getState().resetProjectScope();
}

function warnAboutMalformedFields(project: SavedProject): void {
  const issues: string[] = [];
  if (!project.lines) issues.push("missing lines");
  if (!project.agents || project.agents.length === 0) issues.push("missing or empty agents");
  if (project.granularity === undefined) issues.push("missing granularity");
  if (issues.length === 0) return;
  console.warn(
    `${LOG_PREFIX} loaded project has malformed fields (${issues.join(", ")}); using safe defaults. The raw record is still in IndexedDB; visit /recover to download it.`,
  );
}

function applySavedProject(project: SavedProject, audio: File | undefined): void {
  warnAboutMalformedFields(project);
  // The stem goes first: useAutoSeparate keeps it only if it is set before the source changes.
  if (project.currentStem) useSeparationStore.getState().restoreCurrentStem(project.currentStem);

  const savedSource = project.audioSource;
  if (savedSource?.kind === "youtube") useAudioStore.getState().setYouTubeSource(savedSource.videoId, audio);
  else if (audio) useAudioStore.getState().setSource({ type: "file", file: audio });

  const state = useProjectStore.getState();
  state.setMetadata(normalizeLoadedMetadata(project.metadata));
  state.setLines(project.lines ?? []);
  state.setGroups(project.groups ?? []);
  state.setGranularity(project.granularity ?? useSettingsStore.getState().defaultGranularity);
  state.setSyllableSplitDefaults(project.syllableSplitDefaults ?? DEFAULT_SYLLABLE_SPLIT_DEFAULTS);
  state.setAgents(project.agents && project.agents.length > 0 ? project.agents : DEFAULT_AGENTS);
  state.setDismissedSuggestions(project.dismissedSuggestions ?? []);
  state.setDismissedExplicitSuggestions(project.dismissedExplicitSuggestions ?? []);
  state.setPrimingStripped(project.primingStripped ?? false);
  state.setCustomSnapPoints(project.customSnapPoints ?? []);
  if (project.hasUnexportedImport) state.markSongDetailsImported();
}

function applyProjectToStores(payload: RestorePayload): void {
  restoring = true;
  try {
    resetProjectScopedStores();
    if (payload.project) applySavedProject(payload.project, payload.audio);
    else if (payload.audio) useAudioStore.getState().setSource({ type: "file", file: payload.audio });
    if (payload.lastTab) useProjectStore.getState().setActiveTab(payload.lastTab);
    useProjectStore.getState().markClean();
  } finally {
    restoring = false;
  }
}

function isRestoringProject(): boolean {
  return restoring;
}

// -- Exports ------------------------------------------------------------------

export {
  EMPTY_RESTORE,
  loadProjectForRestore,
  hasStoredProject,
  hasRestorableContent,
  applyProjectToStores,
  isRestoringProject,
};
export type { RestorePayload };
