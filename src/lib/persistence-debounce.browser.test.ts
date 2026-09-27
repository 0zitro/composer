import { adoptOpenProjectId, openProjectIdSnapshot } from "@/lib/open-project-session";
import { saveAudioFile, saveCurrentProject } from "@/lib/persistence";
import { cancelPendingSave, debouncedSave, flushPendingSave } from "@/lib/persistence-debounce";
import { PROJECT_RECORD_STORE_NAME, getAllFromStore } from "@/lib/persistence-idb";
import { listProjectIndex, loadProjectAudio } from "@/lib/project-repository";
import { loadProjectRecord } from "@/lib/project-storage";
import { clearRecoveryStorage } from "@/lib/recovery";
import { useSettingsStore } from "@/stores/settings";
import { saveArgsTitled } from "@/test/projects";
import { beforeEach, describe, expect, it } from "vitest";

// -- Tests --------------------------------------------------------------------

describe("persistence-debounce · save target", () => {
  beforeEach(() => {
    useSettingsStore.setState({ autoSaveDelay: 60_000 });
  });

  it("a debounced save lands in the project it was scheduled for after another is adopted", async () => {
    adoptOpenProjectId("project-a");
    debouncedSave(...saveArgsTitled("Alpha"));
    adoptOpenProjectId("project-b");
    await flushPendingSave();
    expect((await loadProjectRecord("project-a"))?.metadata.title).toBe("Alpha");
    expect(await loadProjectRecord("project-b")).toBeUndefined();
  });

  it("the timer writes into the project it was scheduled for", async () => {
    useSettingsStore.setState({ autoSaveDelay: 10 });
    adoptOpenProjectId("project-a");
    debouncedSave(...saveArgsTitled("Alpha"));
    adoptOpenProjectId("project-b");
    await expect.poll(async () => (await loadProjectRecord("project-a"))?.metadata.title).toBe("Alpha");
    expect(await loadProjectRecord("project-b")).toBeUndefined();
  });

  it("an audio save started before a switch lands in the project it started in", async () => {
    adoptOpenProjectId("project-a");
    const pending = saveAudioFile(new File([new Uint8Array(24)], "a.mp3", { type: "audio/mpeg" }));
    adoptOpenProjectId("project-b");
    await pending;
    expect((await loadProjectAudio("project-a"))?.size).toBe(24);
    expect(await loadProjectAudio("project-b")).toBeUndefined();
  });

  it("the latest schedule wins and writes once", async () => {
    adoptOpenProjectId("project-a");
    debouncedSave(...saveArgsTitled("First"));
    debouncedSave(...saveArgsTitled("Second"));
    await flushPendingSave();
    expect((await loadProjectRecord("project-a"))?.metadata.title).toBe("Second");
  });

  describe("edge cases", () => {
    it("flushing with nothing pending resolves and writes nothing", async () => {
      await flushPendingSave();
      expect(await listProjectIndex()).toEqual([]);
    });

    it("cancelPendingSave drops the pending save", async () => {
      adoptOpenProjectId("project-a");
      debouncedSave(...saveArgsTitled("Dropped"));
      cancelPendingSave();
      await flushPendingSave();
      expect(await loadProjectRecord("project-a")).toBeUndefined();
    });

    it("a first debounced save on a fresh install creates the open project", async () => {
      debouncedSave(...saveArgsTitled("Fresh"));
      await flushPendingSave();
      const id = openProjectIdSnapshot();
      expect(id).toBeDefined();
      expect((await loadProjectRecord(id ?? ""))?.metadata.title).toBe("Fresh");
    });
  });

  describe("regressions", () => {
    it("regression: the unload flush after a recovery clear writes no orphan record", async () => {
      await saveCurrentProject(...saveArgsTitled("Before clear"));
      debouncedSave(...saveArgsTitled("After clear"));
      await clearRecoveryStorage();
      await flushPendingSave();
      expect(await listProjectIndex()).toEqual([]);
      expect(await getAllFromStore(PROJECT_RECORD_STORE_NAME)).toEqual([]);
    });

    it("regression: the first save after a recovery clear starts a fresh project", async () => {
      await saveCurrentProject(...saveArgsTitled("Before clear"));
      const cleared = openProjectIdSnapshot();
      await clearRecoveryStorage();
      await saveCurrentProject(...saveArgsTitled("After clear"));
      const fresh = openProjectIdSnapshot();
      expect(fresh).toBeDefined();
      expect(fresh).not.toBe(cleared);
      expect((await listProjectIndex()).map((entry) => entry.title)).toEqual(["After clear"]);
    });
  });
});
