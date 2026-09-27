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
} from "@/lib/project-restore";
import { isProjectDeleted } from "@/lib/project-tombstones";

// -- Types ----------------------------------------------------------------------

interface PendingOpen {
  id: string;
  generation: number;
  resolve: () => void;
  reject: (error: Error) => void;
}

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[OpenProject]";

// -- Module state -------------------------------------------------------------

let switchGeneration = 0;
let openQueue: PendingOpen[] = [];
let openQueueRunning = false;

// -- Helpers ------------------------------------------------------------------

function logFailure(action: string): (error: unknown) => void {
  return (error) => console.error(LOG_PREFIX, action, error);
}

function resolveThrough(batch: PendingOpen[], upToIndex: number): void {
  for (let i = upToIndex; i >= 0; i--) batch[i].resolve();
}

// -- Boot ---------------------------------------------------------------------

async function restoreOpenProject(): Promise<void> {
  const generation = switchGeneration;
  const id = await findOpenProjectId();
  if (!id) return;
  const payload = await loadProjectForRestore(id);
  if (generation !== switchGeneration || !hasRestorableContent(payload)) return;
  applyProjectToStores(payload);
  markProjectOpened(id, Date.now()).catch(logFailure("could not record when the project was opened"));
}

// -- Switching ----------------------------------------------------------------

async function settleOpenBatch(batch: PendingOpen[]): Promise<void> {
  void flushPendingSave();
  for (let i = batch.length - 1; i >= 0; i--) {
    const entry = batch[i];
    if (entry.generation !== switchGeneration) return resolveThrough(batch, i);
    if (entry.id === openProjectIdSnapshot()) {
      switchGeneration++;
      return resolveThrough(batch, i);
    }
    const payload = await loadProjectForRestore(entry.id);
    if (entry.generation !== switchGeneration) return resolveThrough(batch, i);
    const unusable = !hasStoredProject(payload) || (await isProjectDeleted(entry.id));
    if (entry.generation !== switchGeneration) return resolveThrough(batch, i);
    if (unusable) {
      entry.reject(new Error(`Project ${entry.id} is not stored in this browser`));
      continue;
    }
    switchGeneration++;
    void flushPendingSave();
    adoptOpenProjectId(entry.id);
    applyProjectToStores(payload);
    await Promise.all([
      setOpenProjectId(entry.id).catch(logFailure("could not record the open project")),
      markProjectOpened(entry.id, Date.now()).catch(logFailure("could not record when the project was opened")),
    ]);
    entry.resolve();
    return resolveThrough(batch, i - 1);
  }
}

async function runOpenQueue(): Promise<void> {
  while (openQueue.length > 0) {
    await Promise.resolve();
    const batch = openQueue;
    openQueue = [];
    await settleOpenBatch(batch);
  }
  openQueueRunning = false;
}

function openProject(id: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    openQueue.push({ id, generation: switchGeneration, resolve, reject });
    if (!openQueueRunning) {
      openQueueRunning = true;
      void runOpenQueue();
    }
  });
}

function createProject(): string {
  switchGeneration++;
  void flushPendingSave();
  const id = createProjectId();
  adoptOpenProjectId(id);
  applyProjectToStores(EMPTY_RESTORE);
  setOpenProjectId(id).catch(logFailure("could not record the new project"));
  return id;
}

// -- Removal ------------------------------------------------------------------

async function deleteProject(id: string): Promise<void> {
  if (id === openProjectIdSnapshot()) {
    switchGeneration++;
    cancelPendingSave();
    forgetOpenProjectId();
    applyProjectToStores(EMPTY_RESTORE);
  }
  await removeProjectData(id);
}

// -- Exports ------------------------------------------------------------------

export { restoreOpenProject, openProject, createProject, deleteProject };
