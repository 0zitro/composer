import { PROJECT_STORE_NAME, getFromStore } from "@/lib/persistence-idb";
import { buildProjectBundle, downloadProjectBundle } from "@/lib/project-bundle";
import { downloadProjectFile, projectFileFrom, projectFileName } from "@/lib/project-file";
import {
  LEGACY_PROJECT_KEY,
  clearAllProjects,
  getOpenProjectId,
  listProjectRecords,
  loadProjectRecord,
} from "@/lib/project-storage";
import type { SavedProject } from "@/lib/saved-project";

// -- Types --------------------------------------------------------------------

interface RecoveredProject {
  version?: number;
  savedAt?: number;
  metadata?: { title?: string };
  lines?: unknown[];
}

interface StoredRecovery {
  projectId: string | undefined;
  project: SavedProject;
}

interface RecoveryResult {
  found: boolean;
  filename: string;
  lineCount: number;
  savedAt: number | undefined;
  title: string;
}

interface RecoverableProject {
  key: string;
  title: string;
  lineCount: number;
  savedAt: number | undefined;
}

// -- Constants ----------------------------------------------------------------

const LEGACY_RECOVERY_KEY = "legacy";

const NOT_FOUND_RESULT: RecoveryResult = {
  found: false,
  filename: "",
  lineCount: 0,
  savedAt: undefined,
  title: "",
};

// -- Reading ------------------------------------------------------------------

function byMostRecentlySaved(a: StoredRecovery, b: StoredRecovery): number {
  return (b.project.savedAt ?? 0) - (a.project.savedAt ?? 0);
}

function recoveryKey(stored: StoredRecovery): string {
  return stored.projectId ?? LEGACY_RECOVERY_KEY;
}

async function readStoredProjects(): Promise<StoredRecovery[]> {
  const [records, legacy] = await Promise.all([
    listProjectRecords(),
    getFromStore<SavedProject>(PROJECT_STORE_NAME, LEGACY_PROJECT_KEY),
  ]);
  const stored: StoredRecovery[] = records.map(({ id, project }) => ({ projectId: id, project }));
  if (legacy) stored.push({ projectId: undefined, project: legacy });
  return stored.toSorted(byMostRecentlySaved);
}

async function readProjectFromIDB(): Promise<StoredRecovery | undefined> {
  const openId = await getOpenProjectId();
  const open = openId ? await loadProjectRecord(openId) : undefined;
  if (open) return { projectId: openId, project: open };
  const stored = await readStoredProjects();
  return stored.find((candidate) => candidate.projectId !== undefined) ?? stored[0];
}

function buildRecoveryResult(project: RecoveredProject): RecoveryResult {
  const title = project.metadata?.title?.trim() || "recovered";
  return {
    found: true,
    filename: projectFileName(title, new Date()),
    lineCount: project.lines?.length ?? 0,
    savedAt: project.savedAt,
    title,
  };
}

function downloadStored(stored: StoredRecovery): RecoveryResult {
  const result = buildRecoveryResult(stored.project);
  downloadProjectFile(projectFileFrom(stored.projectId, stored.project), result.filename);
  return result;
}

// -- Public API ---------------------------------------------------------------

async function readRecoveryMetadata(): Promise<RecoveryResult> {
  const stored = await readProjectFromIDB();
  return stored ? buildRecoveryResult(stored.project) : NOT_FOUND_RESULT;
}

async function downloadRecoveryFile(): Promise<RecoveryResult> {
  const stored = await readProjectFromIDB();
  return stored ? downloadStored(stored) : NOT_FOUND_RESULT;
}

async function listRecoverableProjects(): Promise<RecoverableProject[]> {
  return (await readStoredProjects()).map((stored) => {
    const result = buildRecoveryResult(stored.project);
    return { key: recoveryKey(stored), title: result.title, lineCount: result.lineCount, savedAt: result.savedAt };
  });
}

async function downloadRecoverableProject(key: string): Promise<RecoveryResult> {
  const stored = (await readStoredProjects()).find((candidate) => recoveryKey(candidate) === key);
  return stored ? downloadStored(stored) : NOT_FOUND_RESULT;
}

async function downloadAllRecoverableProjects(): Promise<number> {
  const stored = await readStoredProjects();
  if (stored.length === 0) return 0;
  const sources = stored.map(({ projectId, project }) => ({ id: projectId, project }));
  downloadProjectBundle(buildProjectBundle(sources, Date.now()));
  return stored.length;
}

function clearRecoveryStorage(): Promise<void> {
  return clearAllProjects();
}

// -- Exports ------------------------------------------------------------------

export {
  readRecoveryMetadata,
  downloadRecoveryFile,
  listRecoverableProjects,
  downloadRecoverableProject,
  downloadAllRecoverableProjects,
  clearRecoveryStorage,
  buildRecoveryResult,
  NOT_FOUND_RESULT,
};
export type { RecoveredProject, RecoveryResult, RecoverableProject };
