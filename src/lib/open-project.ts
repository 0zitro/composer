import {
  adoptOpenProjectId,
  findOpenProjectId,
  forgetOpenProjectId,
  openProjectIdSnapshot,
} from "@/lib/open-project-session";
import { cancelPendingSave, flushPendingSave } from "@/lib/persistence-debounce";
import { createProjectId, markProjectOpened, removeProjectData, setOpenProjectId } from "@/lib/project-repository";
import { EMPTY_RESTORE, applyProjectToStores, loadProjectForRestore } from "@/lib/project-restore";

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[OpenProject]";

// -- Module state -------------------------------------------------------------

let switchGeneration = 0;

// -- Helpers ------------------------------------------------------------------

function logFailure(action: string): (error: unknown) => void {
  return (error) => console.error(LOG_PREFIX, action, error);
}

// -- Boot ---------------------------------------------------------------------

async function restoreOpenProject(): Promise<void> {
  const generation = switchGeneration;
  const id = await findOpenProjectId();
  if (!id) return;
  const payload = await loadProjectForRestore(id);
  if (generation !== switchGeneration || (!payload.project && !payload.audio)) return;
  applyProjectToStores(payload);
  markProjectOpened(id, Date.now()).catch(logFailure("could not record when the project was opened"));
}

// -- Switching ----------------------------------------------------------------

async function openProject(id: string): Promise<void> {
  if (id === openProjectIdSnapshot()) return;
  const generation = ++switchGeneration;
  void flushPendingSave();
  const payload = await loadProjectForRestore(id);
  if (!payload.project) throw new Error(`Project ${id} is not stored in this browser`);
  if (generation !== switchGeneration) return;
  void flushPendingSave();
  adoptOpenProjectId(id);
  applyProjectToStores(payload);
  await Promise.all([setOpenProjectId(id), markProjectOpened(id, Date.now())]);
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
