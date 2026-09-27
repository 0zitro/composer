import { PROJECT_STORE_NAME, getFromStore } from "@/lib/persistence-idb";
import { downloadProjectFile, projectFileFrom, projectFileName } from "@/lib/project-file";
import { LEGACY_PROJECT_KEY, clearAllProjects, getOpenProjectId, loadProjectRecord } from "@/lib/project-storage";
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

// -- Constants ----------------------------------------------------------------

const NOT_FOUND_RESULT: RecoveryResult = {
  found: false,
  filename: "",
  lineCount: 0,
  savedAt: undefined,
  title: "",
};

// -- Helpers ------------------------------------------------------------------

async function readProjectFromIDB(): Promise<StoredRecovery | undefined> {
  const openId = await getOpenProjectId();
  const open = openId ? await loadProjectRecord(openId) : undefined;
  if (open) return { projectId: openId, project: open };
  const legacy = await getFromStore<SavedProject>(PROJECT_STORE_NAME, LEGACY_PROJECT_KEY);
  return legacy ? { projectId: undefined, project: legacy } : undefined;
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

// -- Public API ---------------------------------------------------------------

async function readRecoveryMetadata(): Promise<RecoveryResult> {
  const stored = await readProjectFromIDB();
  return stored ? buildRecoveryResult(stored.project) : NOT_FOUND_RESULT;
}

async function downloadRecoveryFile(): Promise<RecoveryResult> {
  const stored = await readProjectFromIDB();
  if (!stored) return NOT_FOUND_RESULT;
  const result = buildRecoveryResult(stored.project);
  downloadProjectFile(projectFileFrom(stored.projectId, stored.project), result.filename);
  return result;
}

function clearRecoveryStorage(): Promise<void> {
  return clearAllProjects();
}

// -- Exports ------------------------------------------------------------------

export { readRecoveryMetadata, downloadRecoveryFile, clearRecoveryStorage, buildRecoveryResult, NOT_FOUND_RESULT };
export type { RecoveredProject, RecoveryResult };
