import { DEFAULT_AGENTS } from "@/domain/agent/colors";
import {
  APP_STATE_STORE_NAME,
  PROJECT_INDEX_STORE_NAME,
  PROJECT_RECORD_STORE_NAME,
  PROJECT_STORE_NAME,
  getFromStore,
  setInStore,
} from "@/lib/persistence-idb";
import {
  LEGACY_PROJECT_KEY,
  OPEN_PROJECT_KEY,
  clearAllProjects,
  getOpenProjectId,
  loadProjectRecord,
} from "@/lib/project-storage";
import type { SavedProject } from "@/lib/saved-project";
import { describe, expect, it } from "vitest";

function project(): SavedProject {
  return {
    version: 1,
    savedAt: 1,
    metadata: { title: "Test", artists: [], album: "", duration: 0 },
    agents: DEFAULT_AGENTS,
    lines: [],
    granularity: "word",
  };
}

describe("project-storage", () => {
  it("getOpenProjectId reads whatever id sits under the app-state key", async () => {
    expect(await getOpenProjectId()).toBeUndefined();
    await setInStore(APP_STATE_STORE_NAME, OPEN_PROJECT_KEY, "p1");
    expect(await getOpenProjectId()).toBe("p1");
  });

  it("loadProjectRecord reads a record written directly to the record store", async () => {
    await setInStore(PROJECT_RECORD_STORE_NAME, "p1", project());
    expect((await loadProjectRecord("p1"))?.metadata.title).toBe("Test");
  });

  it("clearAllProjects empties every project store, the legacy keys included", async () => {
    await setInStore(PROJECT_RECORD_STORE_NAME, "p1", project());
    await setInStore(PROJECT_INDEX_STORE_NAME, "p1", { id: "p1" });
    await setInStore(APP_STATE_STORE_NAME, OPEN_PROJECT_KEY, "p1");
    await setInStore(PROJECT_STORE_NAME, LEGACY_PROJECT_KEY, project());

    await clearAllProjects();

    expect(await loadProjectRecord("p1")).toBeUndefined();
    expect(await getFromStore(PROJECT_INDEX_STORE_NAME, "p1")).toBeUndefined();
    expect(await getOpenProjectId()).toBeUndefined();
    expect(await getFromStore(PROJECT_STORE_NAME, LEGACY_PROJECT_KEY)).toBeUndefined();
  });

  describe("edge cases", () => {
    it("loadProjectRecord returns undefined for a missing id", async () => {
      expect(await loadProjectRecord("missing")).toBeUndefined();
    });

    it("clearAllProjects on an empty database resolves without throwing", async () => {
      await expect(clearAllProjects()).resolves.toBeUndefined();
    });
  });
});
