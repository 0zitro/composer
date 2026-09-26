import { type ProjectIndexEntry, buildIndexEntry } from "@/domain/project/index-entry";
import {
  APP_STATE_STORE_NAME,
  PROJECT_AUDIO_STORE_NAME,
  PROJECT_INDEX_STORE_NAME,
  PROJECT_RECORD_STORE_NAME,
  deleteFromStore,
  getAllFromStore,
  getFromStore,
  runTransaction,
  setInStore,
} from "@/lib/persistence-idb";
import { OPEN_PROJECT_KEY } from "@/lib/project-storage";
import type { SavedAudioFile, SavedProject } from "@/lib/saved-project";
import { nanoid } from "nanoid";

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

// -- Exports ------------------------------------------------------------------

export {
  createProjectId,
  indexEntryForProject,
  setOpenProjectId,
  clearOpenProjectId,
  saveProjectRecord,
  listProjectIndex,
  saveProjectAudio,
  loadProjectAudio,
  deleteProjectAudio,
  deleteProject,
};
