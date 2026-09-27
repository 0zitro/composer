import {
  adoptOpenProjectId,
  findOpenProjectId,
  forgetOpenProjectId,
  openProjectIdSnapshot,
} from "@/lib/open-project-session";
import { cancelPendingSave, flushPendingSave } from "@/lib/persistence-debounce";
import { createProjectId, markProjectOpened, removeProjectData, setOpenProjectId } from "@/lib/project-repository";
import {
  EMPTY_RESTORE,
  applyProjectToStores,
  hasRestorableContent,
  hasStoredProject,
  loadProjectForRestore,
  type RestorePayload,
} from "@/lib/project-restore";
import { isProjectDeleted } from "@/lib/project-tombstones";

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[OpenProject]";

// -- Module state -------------------------------------------------------------

let latestRequest = 0;
let appliedRequest = 0;
let openProjectChanges = 0;

// -- Helpers ------------------------------------------------------------------

function logFailure(action: string): (error: unknown) => void {
  return (error) => console.error(LOG_PREFIX, action, error);
}

function claimRequest(): number {
  latestRequest++;
  appliedRequest = latestRequest;
  return latestRequest;
}

function markOpenProjectChanged(): void {
  openProjectChanges++;
}

// -- Boot ---------------------------------------------------------------------

async function restoreOpenProject(): Promise<void> {
  const baseline = openProjectChanges;
  const id = await findOpenProjectId();
  if (!id) return;
  const payload = await loadProjectForRestore(id);
  if (openProjectChanges !== baseline || !hasRestorableContent(payload)) return;
  applyProjectToStores(payload);
  markProjectOpened(id, Date.now()).catch(logFailure("could not record when the project was opened"));
}

// -- Switching ----------------------------------------------------------------

async function isOpenable(id: string, payload: RestorePayload): Promise<boolean> {
  return hasStoredProject(payload) && !(await isProjectDeleted(id));
}

async function openProject(id: string): Promise<void> {
  if (id === openProjectIdSnapshot()) {
    claimRequest();
    return;
  }
  void flushPendingSave();
  const request = ++latestRequest;
  const payload = await loadProjectForRestore(id);
  const openable = await isOpenable(id, payload);
  if (request <= appliedRequest) return;
  if (!openable) {
    if (request !== latestRequest) return;
    throw new Error(`Project ${id} is not stored in this browser`);
  }
  appliedRequest = request;
  if (id === openProjectIdSnapshot()) return;
  markOpenProjectChanged();
  void flushPendingSave();
  adoptOpenProjectId(id);
  applyProjectToStores(payload);
  await Promise.all([
    setOpenProjectId(id).catch(logFailure("could not record the open project")),
    markProjectOpened(id, Date.now()).catch(logFailure("could not record when the project was opened")),
  ]);
}

function createProject(): string {
  claimRequest();
  markOpenProjectChanged();
  void flushPendingSave();
  const id = createProjectId();
  adoptOpenProjectId(id);
  applyProjectToStores(EMPTY_RESTORE);
  setOpenProjectId(id).catch(logFailure("could not record the new project"));
  return id;
}

// -- Removal ------------------------------------------------------------------

function closeIfOpen(id: string): void {
  if (id !== openProjectIdSnapshot()) return;
  claimRequest();
  markOpenProjectChanged();
  cancelPendingSave();
  forgetOpenProjectId();
  applyProjectToStores(EMPTY_RESTORE);
}

async function deleteProject(id: string): Promise<void> {
  closeIfOpen(id);
  await removeProjectData(id);
  closeIfOpen(id);
}

// -- Exports ------------------------------------------------------------------

export { restoreOpenProject, openProject, createProject, deleteProject };
