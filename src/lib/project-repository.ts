import { nanoid } from "nanoid";
import { buildIndexEntry, type ProjectIndexEntry } from "@/domain/project/index-entry";
import {
  APP_STATE_STORE_NAME,
  PROJECT_AUDIO_STORE_NAME,
  PROJECT_INDEX_STORE_NAME,
  PROJECT_RECORD_STORE_NAME,
  PROJECT_STORE_NAME,
  deleteFromStore,
  getAllFromStore,
  getFromStore,
  runTransaction,
  setInStore,
} from "@/lib/persistence-idb";
import type { SavedAudioFile, SavedProject } from "@/lib/saved-project";

// -- Constants ----------------------------------------------------------------

const OPEN_PROJECT_KEY = "open-project-id";

// -- Identity -----------------------------------------------------------------

function createProjectId(): string {
  return nanoid();
}

function indexEntryForProject(id: string, project: SavedProject, storedAudioBytes: number): ProjectIndexEntry {
  return buildIndexEntry({
    id,
    metadata: project.metadata,
    lines: project.lines,
    audioSource: project.audioSource,
    storedAudioBytes,
    updatedAt: project.savedAt,
  });
}

// -- Open project pointer -----------------------------------------------------

function getOpenProjectId(): Promise<string | undefined> {
  return getFromStore<string>(APP_STATE_STORE_NAME, OPEN_PROJECT_KEY);
}

function setOpenProjectId(id: string): Promise<void> {
  return setInStore(APP_STATE_STORE_NAME, OPEN_PROJECT_KEY, id);
}

function clearOpenProjectId(): Promise<void> {
  return deleteFromStore(APP_STATE_STORE_NAME, OPEN_PROJECT_KEY);
}

// -- Records ------------------------------------------------------------------

function saveProjectRecord(id: string, project: SavedProject): Promise<void> {
  const stores = [PROJECT_RECORD_STORE_NAME, PROJECT_INDEX_STORE_NAME, PROJECT_AUDIO_STORE_NAME];
  return runTransaction(stores, "readwrite", (tx) => {
    const index = tx.objectStore(PROJECT_INDEX_STORE_NAME);
    tx.objectStore(PROJECT_RECORD_STORE_NAME).put(project, id);
    const previous = index.get(id);
    previous.onsuccess = () => {
      const entry = previous.result as ProjectIndexEntry | undefined;
      if (entry) {
        index.put(indexEntryForProject(id, project, entry.storedAudioBytes), id);
        return;
      }
      const audio = tx.objectStore(PROJECT_AUDIO_STORE_NAME).get(id);
      audio.onsuccess = () => {
        const saved = audio.result as SavedAudioFile | undefined;
        index.put(indexEntryForProject(id, project, saved?.data.byteLength ?? 0), id);
      };
    };
  });
}

function loadProjectRecord(id: string): Promise<SavedProject | undefined> {
  return getFromStore<SavedProject>(PROJECT_RECORD_STORE_NAME, id);
}

function listProjectIndex(): Promise<ProjectIndexEntry[]> {
  return getAllFromStore<ProjectIndexEntry>(PROJECT_INDEX_STORE_NAME);
}

// -- Audio --------------------------------------------------------------------

function setIndexAudioBytes(tx: IDBTransaction, id: string, bytes: number): void {
  const index = tx.objectStore(PROJECT_INDEX_STORE_NAME);
  const request = index.get(id);
  request.onsuccess = () => {
    const entry = request.result as ProjectIndexEntry | undefined;
    if (entry) index.put({ ...entry, storedAudioBytes: bytes }, id);
  };
}

async function saveProjectAudio(id: string, file: File): Promise<void> {
  const data = await file.arrayBuffer();
  const saved: SavedAudioFile = { name: file.name, type: file.type, data };
  await runTransaction([PROJECT_AUDIO_STORE_NAME, PROJECT_INDEX_STORE_NAME], "readwrite", (tx) => {
    tx.objectStore(PROJECT_AUDIO_STORE_NAME).put(saved, id);
    setIndexAudioBytes(tx, id, data.byteLength);
  });
}

async function loadProjectAudio(id: string): Promise<File | undefined> {
  const saved = await getFromStore<SavedAudioFile>(PROJECT_AUDIO_STORE_NAME, id);
  if (!saved) return undefined;
  return new File([saved.data], saved.name, { type: saved.type });
}

function deleteProjectAudio(id: string): Promise<void> {
  return runTransaction([PROJECT_AUDIO_STORE_NAME, PROJECT_INDEX_STORE_NAME], "readwrite", (tx) => {
    tx.objectStore(PROJECT_AUDIO_STORE_NAME).delete(id);
    setIndexAudioBytes(tx, id, 0);
  });
}

// -- Removal ------------------------------------------------------------------

function deleteProject(id: string): Promise<void> {
  const stores = [PROJECT_RECORD_STORE_NAME, PROJECT_INDEX_STORE_NAME, PROJECT_AUDIO_STORE_NAME];
  return runTransaction(stores, "readwrite", (tx) => {
    for (const name of stores) tx.objectStore(name).delete(id);
  });
}

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
  createProjectId,
  indexEntryForProject,
  getOpenProjectId,
  setOpenProjectId,
  clearOpenProjectId,
  saveProjectRecord,
  loadProjectRecord,
  listProjectIndex,
  saveProjectAudio,
  loadProjectAudio,
  deleteProjectAudio,
  deleteProject,
  clearAllProjects,
};
