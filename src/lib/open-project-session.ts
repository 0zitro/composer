import { migrateLegacyProject } from "@/lib/project-migration";
import { createProjectId, setOpenProjectId } from "@/lib/project-repository";
import { getOpenProjectId, onProjectsCleared } from "@/lib/project-storage";

// -- Module state -------------------------------------------------------------

let openProjectIdLookup: Promise<string | undefined> | null = null;
let openProjectIdCreation: Promise<string> | null = null;
let knownOpenProjectId: string | undefined;
let knownSaveTarget: Promise<string> | null = null;
let sessionGeneration = 0;
const listeners = new Set<() => void>();

// -- Publishing ---------------------------------------------------------------

function publishOpenProjectId(id: string | undefined, generation: number): void {
  if (generation !== sessionGeneration || id === knownOpenProjectId) return;
  knownOpenProjectId = id;
  knownSaveTarget = id === undefined ? null : Promise.resolve(id);
  for (const listener of listeners) listener();
}

// -- Lookup -------------------------------------------------------------------

function findOpenProjectId(): Promise<string | undefined> {
  const generation = sessionGeneration;
  openProjectIdLookup ??= getOpenProjectId()
    .then((id) => id ?? migrateLegacyProject())
    .then(
      (id) => {
        publishOpenProjectId(id, generation);
        return id;
      },
      (error: unknown) => {
        if (generation === sessionGeneration) openProjectIdLookup = null;
        throw error;
      },
    );
  return openProjectIdLookup;
}

function ensureOpenProjectId(): Promise<string> {
  const generation = sessionGeneration;
  openProjectIdCreation ??= findOpenProjectId()
    .then(async (existing) => {
      if (existing) return existing;
      const id = createProjectId();
      await setOpenProjectId(id);
      if (generation === sessionGeneration) openProjectIdLookup = Promise.resolve(id);
      publishOpenProjectId(id, generation);
      return id;
    })
    .catch((error: unknown) => {
      if (generation === sessionGeneration) {
        openProjectIdCreation = null;
        openProjectIdLookup = null;
      }
      throw error;
    });
  return openProjectIdCreation;
}

// -- Switching ----------------------------------------------------------------

function adoptOpenProjectId(id: string): void {
  sessionGeneration++;
  openProjectIdLookup = Promise.resolve(id);
  openProjectIdCreation = Promise.resolve(id);
  publishOpenProjectId(id, sessionGeneration);
}

function forgetOpenProjectId(): void {
  sessionGeneration++;
  openProjectIdLookup = null;
  openProjectIdCreation = null;
  publishOpenProjectId(undefined, sessionGeneration);
}

// -- Snapshot -----------------------------------------------------------------

function openProjectIdSnapshot(): string | undefined {
  return knownOpenProjectId;
}

function subscribeOpenProjectId(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// -- Save targets -------------------------------------------------------------

function bindSaveTarget(): Promise<string> {
  if (knownSaveTarget) return knownSaveTarget;
  const target = ensureOpenProjectId();
  // A superseded target is never awaited by its caller; swallow here so it never surfaces as an unhandled rejection.
  target.catch(() => undefined);
  return target;
}

// -- Wiring -------------------------------------------------------------------

onProjectsCleared(forgetOpenProjectId);

// -- Exports ------------------------------------------------------------------

export {
  findOpenProjectId,
  ensureOpenProjectId,
  adoptOpenProjectId,
  forgetOpenProjectId,
  openProjectIdSnapshot,
  subscribeOpenProjectId,
  bindSaveTarget,
};
