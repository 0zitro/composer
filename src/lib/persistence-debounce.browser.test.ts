import { adoptOpenProjectId, openProjectIdSnapshot } from "@/lib/open-project-session";
import { saveAudioFile, saveCurrentProject } from "@/lib/persistence";
import { cancelPendingSave, debouncedSave, flushPendingSave } from "@/lib/persistence-debounce";
import { DB_NAME, DB_VERSION, PROJECT_RECORD_STORE_NAME, getAllFromStore } from "@/lib/persistence-idb";
import { listProjectIndex, loadProjectAudio } from "@/lib/project-repository";
import { loadProjectRecord } from "@/lib/project-storage";
import { clearRecoveryStorage } from "@/lib/recovery";
import { getSaveStatus, subscribeSaveStatus } from "@/lib/save-status";
import { useSettingsStore } from "@/stores/settings";
import { allowConsole } from "@/test/console-guard";
import { deleteDatabase } from "@/test/idb";
import { saveArgsTitled } from "@/test/projects";
import { beforeEach, describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

function openAndCloseAtVersion(name: string, version: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = () => {};
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

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

    it("regression: a save bound during creation never lands in a project adopted before the flush", async () => {
      debouncedSave(...saveArgsTitled("Fresh session"));
      adoptOpenProjectId("x");
      await flushPendingSave();
      expect(await loadProjectRecord("x")).toBeUndefined();
      const [entry] = await listProjectIndex();
      expect(entry?.title).toBe("Fresh session");
      expect(entry?.id).not.toBe("x");
    });
  });

  describe("save status", () => {
    it("reads saving while a save waits and saved once it is written", async () => {
      adoptOpenProjectId("project-a");
      debouncedSave(...saveArgsTitled("Alpha"));
      expect(getSaveStatus()).toBe("saving");
      await flushPendingSave();
      expect(getSaveStatus()).toBe("saved");
    });

    it("reads saved again after the pending save is cancelled", () => {
      adoptOpenProjectId("project-a");
      debouncedSave(...saveArgsTitled("Alpha"));
      cancelPendingSave();
      expect(getSaveStatus()).toBe("saved");
    });

    it("never notifies saved while flushing a pending save", async () => {
      adoptOpenProjectId("project-a");
      debouncedSave(...saveArgsTitled("Alpha"));
      const statuses: string[] = [];
      const unsubscribe = subscribeSaveStatus(() => statuses.push(getSaveStatus()));
      const flushed = flushPendingSave();
      expect(statuses).not.toContain("saved");
      await flushed;
      unsubscribe();
      expect(getSaveStatus()).toBe("saved");
    });

    describe("regressions", () => {
      it("regression: a rejected debounced write is reported as failed", async () => {
        allowConsole(/Flush save failed/);
        await openAndCloseAtVersion(DB_NAME, DB_VERSION + 1);
        adoptOpenProjectId("project-a");
        debouncedSave(...saveArgsTitled("Alpha"));
        await flushPendingSave();
        expect(getSaveStatus()).toBe("failed");
        await deleteDatabase(DB_NAME);
      });

      it("regression: a failed status from a previous test never leaks into the next one", () => {
        expect(getSaveStatus()).toBe("saved");
      });
    });
  });
});
