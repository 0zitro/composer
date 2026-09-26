// -- Constants ----------------------------------------------------------------

const DB_NAME = "ttml-composer";
const DB_VERSION = 3;
const PROJECT_STORE_NAME = "projects";
const STEM_STORE_NAME = "separated-stems";
const PROJECT_RECORD_STORE_NAME = "project-records";
const PROJECT_INDEX_STORE_NAME = "project-index";
const PROJECT_AUDIO_STORE_NAME = "project-audio";
const APP_STATE_STORE_NAME = "app-state";
const ALL_STORE_NAMES = [
  PROJECT_STORE_NAME,
  STEM_STORE_NAME,
  PROJECT_RECORD_STORE_NAME,
  PROJECT_INDEX_STORE_NAME,
  PROJECT_AUDIO_STORE_NAME,
  APP_STATE_STORE_NAME,
];

// -- Connection ---------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      for (const name of ALL_STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
      }
    };
  });
}

// -- Generic CRUD -------------------------------------------------------------

async function getFromStore<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(key);
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
    request.onsuccess = () => resolve(request.result as T | undefined);
    transaction.oncomplete = () => db.close();
  });
}

async function setInStore<T>(storeName: string, key: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const request = transaction.objectStore(storeName).put(value, key);
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
    request.onsuccess = () => resolve();
    transaction.oncomplete = () => db.close();
  });
}

async function deleteFromStore(storeName: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const request = transaction.objectStore(storeName).delete(key);
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
    request.onsuccess = () => resolve();
    transaction.oncomplete = () => db.close();
  });
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).getAll();
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
    request.onsuccess = () => resolve(request.result as T[]);
    transaction.oncomplete = () => db.close();
  });
}

async function runTransaction(
  storeNames: string[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction) => void,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, mode);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    };
    work(transaction);
  });
}

// -- Exports ------------------------------------------------------------------

export {
  DB_NAME,
  DB_VERSION,
  PROJECT_STORE_NAME,
  STEM_STORE_NAME,
  PROJECT_RECORD_STORE_NAME,
  PROJECT_INDEX_STORE_NAME,
  PROJECT_AUDIO_STORE_NAME,
  APP_STATE_STORE_NAME,
  openDB,
  getFromStore,
  getAllFromStore,
  setInStore,
  deleteFromStore,
  runTransaction,
};
