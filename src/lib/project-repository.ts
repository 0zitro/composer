import { type ProjectIndexEntry, buildIndexEntry } from "@/domain/project/index-entry";
import type { ProjectTab } from "@/domain/project/tab";
import {
  APP_STATE_STORE_NAME,
  PROJECT_AUDIO_STORE_NAME,
  PROJECT_INDEX_STORE_NAME,
  PROJECT_RECORD_STORE_NAME,
  deleteFromStore,
  getAllFromStore,
  getFromStore,
  runTransaction,
} from "@/lib/persistence-idb";
import { announceProjectsDeleted } from "@/lib/project-channel";
import { OPEN_PROJECT_KEY, PROJECT_DATA_STORES } from "@/lib/project-storage";
import { whenProjectWritable, writeTombstone } from "@/lib/project-tombstones";
import type { SavedAudioFile, SavedProject } from "@/lib/saved-project";
import { nanoid } from "nanoid";

// -- Types --------------------------------------------------------------------

interface IndexCarriedFields {
  storedAudioBytes: number;
  openedAt?: number;
  lastTab?: ProjectTab;
}

type IndexPatch = Partial<IndexCarriedFields>;

// -- Identity -----------------------------------------------------------------

function createProjectId(): string {
  return nanoid();
}

function indexEntryForProject(id: string, project: SavedProject, carried: IndexCarriedFields): ProjectIndexEntry {
  return buildIndexEntry({
    id,
    metadata: project.metadata,
    lines: project.lines,
    audioSource: project.audioSource,
    updatedAt: project.savedAt,
    ...carried,
  });
}

function carriedIndexFields(entry: ProjectIndexEntry): IndexCarriedFields {
  return { storedAudioBytes: entry.storedAudioBytes, openedAt: entry.openedAt, lastTab: entry.lastTab };
}

// -- Open project pointer -----------------------------------------------------

function setOpenProjectId(id: string): Promise<void> {
  return runTransaction([APP_STATE_STORE_NAME], "readwrite", (tx) => {
    whenProjectWritable(tx, id, () => tx.objectStore(APP_STATE_STORE_NAME).put(id, OPEN_PROJECT_KEY));
  });
}

function clearOpenProjectId(): Promise<void> {
  return deleteFromStore(APP_STATE_STORE_NAME, OPEN_PROJECT_KEY);
}

// -- Records ------------------------------------------------------------------

function saveProjectRecord(id: string, project: SavedProject): Promise<void> {
  const stores = [PROJECT_RECORD_STORE_NAME, PROJECT_INDEX_STORE_NAME, PROJECT_AUDIO_STORE_NAME, APP_STATE_STORE_NAME];
  return runTransaction(stores, "readwrite", (tx) => {
    whenProjectWritable(tx, id, () => {
      const index = tx.objectStore(PROJECT_INDEX_STORE_NAME);
      tx.objectStore(PROJECT_RECORD_STORE_NAME).put(project, id);
      const previous = index.get(id);
      previous.onsuccess = () => {
        const entry = previous.result as ProjectIndexEntry | undefined;
        if (entry) {
          index.put(indexEntryForProject(id, project, carriedIndexFields(entry)), id);
          return;
        }
        const audio = tx.objectStore(PROJECT_AUDIO_STORE_NAME).get(id);
        audio.onsuccess = () => {
          const saved = audio.result as SavedAudioFile | undefined;
          const carried = { storedAudioBytes: saved?.data.byteLength ?? 0, openedAt: project.savedAt };
          index.put(indexEntryForProject(id, project, carried), id);
        };
      };
    });
  });
}

// -- Index --------------------------------------------------------------------

function listProjectIndex(): Promise<ProjectIndexEntry[]> {
  return getAllFromStore<ProjectIndexEntry>(PROJECT_INDEX_STORE_NAME);
}

function loadProjectIndexEntry(id: string): Promise<ProjectIndexEntry | undefined> {
  return getFromStore<ProjectIndexEntry>(PROJECT_INDEX_STORE_NAME, id);
}

async function findProjectByVideoId(videoId: string): Promise<ProjectIndexEntry | undefined> {
  const matches = (await listProjectIndex()).filter((entry) => entry.videoId === videoId);
  return matches.toSorted((a, b) => b.updatedAt - a.updatedAt)[0];
}

function patchIndexEntry(tx: IDBTransaction, id: string, patch: IndexPatch): void {
  const index = tx.objectStore(PROJECT_INDEX_STORE_NAME);
  const request = index.get(id);
  request.onsuccess = () => {
    const entry = request.result as ProjectIndexEntry | undefined;
    if (entry) index.put({ ...entry, ...patch }, id);
  };
}

function patchProjectIndex(id: string, patch: IndexPatch): Promise<void> {
  return runTransaction([PROJECT_INDEX_STORE_NAME], "readwrite", (tx) => patchIndexEntry(tx, id, patch));
}

function markProjectOpened(id: string, openedAt: number): Promise<void> {
  return patchProjectIndex(id, { openedAt });
}

function setProjectLastTab(id: string, lastTab: ProjectTab): Promise<void> {
  return patchProjectIndex(id, { lastTab });
}

// -- Audio --------------------------------------------------------------------

async function saveProjectAudio(id: string, file: File): Promise<void> {
  const data = await file.arrayBuffer();
  const saved: SavedAudioFile = { name: file.name, type: file.type, data };
  const stores = [PROJECT_AUDIO_STORE_NAME, PROJECT_INDEX_STORE_NAME, APP_STATE_STORE_NAME];
  await runTransaction(stores, "readwrite", (tx) => {
    whenProjectWritable(tx, id, () => {
      tx.objectStore(PROJECT_AUDIO_STORE_NAME).put(saved, id);
      patchIndexEntry(tx, id, { storedAudioBytes: data.byteLength });
    });
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
    patchIndexEntry(tx, id, { storedAudioBytes: 0 });
  });
}

// -- Removal ------------------------------------------------------------------

function removeProjectData(id: string): Promise<void> {
  return runTransaction([...PROJECT_DATA_STORES, APP_STATE_STORE_NAME], "readwrite", (tx) => {
    writeTombstone(tx, id);
    for (const name of PROJECT_DATA_STORES) tx.objectStore(name).delete(id);
    const appState = tx.objectStore(APP_STATE_STORE_NAME);
    const pointer = appState.get(OPEN_PROJECT_KEY);
    pointer.onsuccess = () => {
      if (pointer.result === id) appState.delete(OPEN_PROJECT_KEY);
    };
  }).then(() => announceProjectsDeleted([id]));
}

// -- Exports ------------------------------------------------------------------

export {
  createProjectId,
  indexEntryForProject,
  setOpenProjectId,
  clearOpenProjectId,
  saveProjectRecord,
  listProjectIndex,
  loadProjectIndexEntry,
  findProjectByVideoId,
  markProjectOpened,
  setProjectLastTab,
  saveProjectAudio,
  loadProjectAudio,
  deleteProjectAudio,
  removeProjectData,
};
export type { IndexCarriedFields };
