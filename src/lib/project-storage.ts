import {
  APP_STATE_STORE_NAME,
  PROJECT_AUDIO_STORE_NAME,
  PROJECT_INDEX_STORE_NAME,
  PROJECT_RECORD_STORE_NAME,
  PROJECT_STORE_NAME,
  getFromStore,
  runTransaction,
} from "@/lib/persistence-idb";
import type { SavedProject } from "@/lib/saved-project";

// -- Constants ----------------------------------------------------------------

const OPEN_PROJECT_KEY = "open-project-id";
const LEGACY_PROJECT_KEY = "current";
const LEGACY_AUDIO_KEY = "current-audio";

// -- Reads --------------------------------------------------------------------

function getOpenProjectId(): Promise<string | undefined> {
  return getFromStore<string>(APP_STATE_STORE_NAME, OPEN_PROJECT_KEY);
}

function loadProjectRecord(id: string): Promise<SavedProject | undefined> {
  return getFromStore<SavedProject>(PROJECT_RECORD_STORE_NAME, id);
}

// -- Removal ------------------------------------------------------------------

function clearAllProjects(): Promise<void> {
  const stores = [
    PROJECT_STORE_NAME,
    PROJECT_RECORD_STORE_NAME,
    PROJECT_INDEX_STORE_NAME,
    PROJECT_AUDIO_STORE_NAME,
    APP_STATE_STORE_NAME,
  ];
  return runTransaction(stores, "readwrite", (tx) => {
    for (const name of stores) tx.objectStore(name).clear();
  });
}

// -- Exports ------------------------------------------------------------------

export {
  OPEN_PROJECT_KEY,
  LEGACY_PROJECT_KEY,
  LEGACY_AUDIO_KEY,
  getOpenProjectId,
  loadProjectRecord,
  clearAllProjects,
};
