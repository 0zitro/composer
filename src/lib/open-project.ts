import { findOpenProjectId } from "@/lib/open-project-session";
import { markProjectOpened } from "@/lib/project-repository";
import { applyProjectToStores, loadProjectForRestore } from "@/lib/project-restore";

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[OpenProject]";

// -- Module state -------------------------------------------------------------

const switchGeneration = 0;

// -- Boot ---------------------------------------------------------------------

async function restoreOpenProject(): Promise<void> {
  const generation = switchGeneration;
  const id = await findOpenProjectId();
  if (!id) return;
  const payload = await loadProjectForRestore(id);
  if (generation !== switchGeneration || (!payload.project && !payload.audio)) return;
  applyProjectToStores(payload);
  markProjectOpened(id, Date.now()).catch((error: unknown) =>
    console.error(LOG_PREFIX, "could not record when the project was opened", error),
  );
}

// -- Exports ------------------------------------------------------------------

export { restoreOpenProject };
