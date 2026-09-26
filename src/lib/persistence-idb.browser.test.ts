import { describe, expect, it } from "vitest";
import {
  APP_STATE_STORE_NAME,
  DB_NAME,
  DB_VERSION,
  PROJECT_AUDIO_STORE_NAME,
  PROJECT_INDEX_STORE_NAME,
  PROJECT_RECORD_STORE_NAME,
  PROJECT_STORE_NAME,
  STEM_STORE_NAME,
  deleteFromStore,
  getAllFromStore,
  getFromStore,
  openDB,
  runTransaction,
  setInStore,
} from "@/lib/persistence-idb";

// The shared browser setup (src/test/setup-browser.ts) deletes the entire
// `ttml-composer` database before every test, so each test starts from a
// fresh cold-open of the schema.

// -- Schema -------------------------------------------------------------------

describe("persistence-idb · schema", () => {
  it("openDB returns a db at the expected version with every store", async () => {
    const db = await openDB();
    expect(db.version).toBe(3);
    for (const name of [
      PROJECT_STORE_NAME,
      STEM_STORE_NAME,
      PROJECT_RECORD_STORE_NAME,
      PROJECT_INDEX_STORE_NAME,
      PROJECT_AUDIO_STORE_NAME,
      APP_STATE_STORE_NAME,
    ]) {
      expect(db.objectStoreNames.contains(name)).toBe(true);
    }
    db.close();
  });

  it("opening twice returns a db with identical schema (no spurious upgrade)", async () => {
    const first = await openDB();
    expect(first.version).toBe(DB_VERSION);
    first.close();
    const second = await openDB();
    expect(second.version).toBe(DB_VERSION);
    expect(second.objectStoreNames.contains(PROJECT_STORE_NAME)).toBe(true);
    expect(second.objectStoreNames.contains(STEM_STORE_NAME)).toBe(true);
    second.close();
  });
});

// -- CRUD ---------------------------------------------------------------------

describe("persistence-idb · CRUD", () => {
  it("getFromStore returns undefined when key absent", async () => {
    const value = await getFromStore<string>(PROJECT_STORE_NAME, "missing-key");
    expect(value).toBeUndefined();
  });

  it("set + get round-trips primitive values", async () => {
    await setInStore<string>(PROJECT_STORE_NAME, "k", "hello");
    expect(await getFromStore<string>(PROJECT_STORE_NAME, "k")).toBe("hello");
  });

  it("set + get round-trips structured values", async () => {
    const value = { title: "Song", tags: ["a", "b"], nested: { count: 3 } };
    await setInStore(PROJECT_STORE_NAME, "k", value);
    expect(await getFromStore(PROJECT_STORE_NAME, "k")).toEqual(value);
  });

  it("set overwrites the previous value at the same key", async () => {
    await setInStore(PROJECT_STORE_NAME, "k", "first");
    await setInStore(PROJECT_STORE_NAME, "k", "second");
    expect(await getFromStore(PROJECT_STORE_NAME, "k")).toBe("second");
  });

  it("deleteFromStore removes a present key", async () => {
    await setInStore(PROJECT_STORE_NAME, "k", "v");
    await deleteFromStore(PROJECT_STORE_NAME, "k");
    expect(await getFromStore(PROJECT_STORE_NAME, "k")).toBeUndefined();
  });

  it("deleteFromStore on an absent key resolves without throwing", async () => {
    await expect(deleteFromStore(PROJECT_STORE_NAME, "never-set")).resolves.toBeUndefined();
  });
});

// -- Isolation between stores -------------------------------------------------

describe("persistence-idb · store isolation", () => {
  it("the same key in different stores resolves to independent values", async () => {
    await setInStore(PROJECT_STORE_NAME, "shared", "project-side");
    await setInStore(STEM_STORE_NAME, "shared", "stem-side");
    expect(await getFromStore(PROJECT_STORE_NAME, "shared")).toBe("project-side");
    expect(await getFromStore(STEM_STORE_NAME, "shared")).toBe("stem-side");
  });

  it("deleting from one store leaves the other store's value intact", async () => {
    await setInStore(PROJECT_STORE_NAME, "shared", "p");
    await setInStore(STEM_STORE_NAME, "shared", "s");
    await deleteFromStore(PROJECT_STORE_NAME, "shared");
    expect(await getFromStore(PROJECT_STORE_NAME, "shared")).toBeUndefined();
    expect(await getFromStore(STEM_STORE_NAME, "shared")).toBe("s");
  });
});

// -- Upgrade --------------------------------------------------------------------

function openAtVersion(version: number, create: (db: IDBDatabase) => void): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, version);
    request.onupgradeneeded = () => create(request.result);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

describe("persistence-idb · upgrade", () => {
  it("regression: upgrading from v2 keeps the legacy current project", async () => {
    const v2 = await openAtVersion(2, (db) => {
      db.createObjectStore(PROJECT_STORE_NAME);
      db.createObjectStore(STEM_STORE_NAME);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = v2.transaction(PROJECT_STORE_NAME, "readwrite");
      tx.objectStore(PROJECT_STORE_NAME).put({ version: 1, lines: [] }, "current");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    v2.close();

    expect(await getFromStore(PROJECT_STORE_NAME, "current")).toEqual({ version: 1, lines: [] });
  });
});

// -- Transactions ---------------------------------------------------------------

describe("persistence-idb · runTransaction", () => {
  it("writes to several stores in one transaction", async () => {
    await runTransaction([PROJECT_RECORD_STORE_NAME, PROJECT_INDEX_STORE_NAME], "readwrite", (tx) => {
      tx.objectStore(PROJECT_RECORD_STORE_NAME).put({ a: 1 }, "p1");
      tx.objectStore(PROJECT_INDEX_STORE_NAME).put({ b: 2 }, "p1");
    });
    expect(await getFromStore(PROJECT_RECORD_STORE_NAME, "p1")).toEqual({ a: 1 });
    expect(await getFromStore(PROJECT_INDEX_STORE_NAME, "p1")).toEqual({ b: 2 });
  });

  it("rolls every write back when the transaction aborts", async () => {
    await expect(
      runTransaction([PROJECT_RECORD_STORE_NAME, PROJECT_INDEX_STORE_NAME], "readwrite", (tx) => {
        tx.objectStore(PROJECT_RECORD_STORE_NAME).put({ a: 1 }, "p1");
        tx.abort();
      }),
    ).rejects.toThrow();
    expect(await getFromStore(PROJECT_RECORD_STORE_NAME, "p1")).toBeUndefined();
  });

  it("getAllFromStore returns every value and an empty array for an empty store", async () => {
    expect(await getAllFromStore(PROJECT_INDEX_STORE_NAME)).toEqual([]);
    await setInStore(PROJECT_INDEX_STORE_NAME, "a", { id: "a" });
    await setInStore(PROJECT_INDEX_STORE_NAME, "b", { id: "b" });
    const all = await getAllFromStore<{ id: string }>(PROJECT_INDEX_STORE_NAME);
    expect(all.map((entry) => entry.id).toSorted()).toEqual(["a", "b"]);
  });
});
