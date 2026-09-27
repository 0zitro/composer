import { openProject, restoreOpenProject } from "@/lib/open-project";
import { openProjectIdSnapshot } from "@/lib/open-project-session";
import { debouncedSave } from "@/lib/persistence-debounce";
import { loadProjectIndexEntry, setProjectLastTab } from "@/lib/project-repository";
import { buildSaveArgs } from "@/lib/project-snapshot";
import { getOpenProjectId, loadProjectRecord } from "@/lib/project-storage";
import { useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { useSettingsStore } from "@/stores/settings";
import { createAudioFile } from "@/test/audio-fixtures";
import { seedStoredProject, songTitled } from "@/test/projects";
import { beforeEach, describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

async function seedTwoProjects(): Promise<void> {
  await seedStoredProject("a", {
    open: true,
    audio: createAudioFile("a.wav"),
    project: { ...songTitled("Alpha"), audioSource: { kind: "file", name: "a.wav" } },
  });
  await seedStoredProject("b", {
    audio: createAudioFile("b.wav"),
    project: { ...songTitled("Bravo"), audioSource: { kind: "file", name: "b.wav" } },
  });
  await restoreOpenProject();
}

function scheduleSaveOfStores(): void {
  const args = buildSaveArgs();
  if (!args) throw new Error("expected something to save");
  debouncedSave(...args);
}

function openTitle(): string {
  return useProjectStore.getState().metadata.title;
}

// -- Tests --------------------------------------------------------------------

describe("openProject", () => {
  beforeEach(() => {
    useSettingsStore.setState({ autoSaveDelay: 60_000 });
  });

  it("loads the other project into the stores and makes it the open project", async () => {
    await seedTwoProjects();
    await openProject("b");
    expect(openProjectIdSnapshot()).toBe("b");
    expect(openTitle()).toBe("Bravo");
    const source = useAudioStore.getState().source;
    expect(source?.type === "file" ? source.file.name : null).toBe("b.wav");
    expect(await getOpenProjectId()).toBe("b");
    expect((await loadProjectIndexEntry("b"))?.openedAt).toBeGreaterThan(1_758_900_000_000);
  });

  it("restores the tab the project was last on", async () => {
    await seedTwoProjects();
    await setProjectLastTab("b", "sync");
    await openProject("b");
    expect(useProjectStore.getState().activeTab).toBe("sync");
  });

  it("an edit waiting to save lands in the project it was made in", async () => {
    await seedTwoProjects();
    useProjectStore.getState().setMetadata({ title: "Alpha (edited)" });
    scheduleSaveOfStores();
    await openProject("b");
    await expect.poll(async () => (await loadProjectRecord("a"))?.metadata.title).toBe("Alpha (edited)");
    expect((await loadProjectRecord("b"))?.metadata.title).toBe("Bravo");
  });

  it("switching back shows the saved edit", async () => {
    await seedTwoProjects();
    useProjectStore.getState().setMetadata({ title: "Alpha (edited)" });
    scheduleSaveOfStores();
    await openProject("b");
    await expect.poll(async () => (await loadProjectRecord("a"))?.metadata.title).toBe("Alpha (edited)");
    await openProject("a");
    expect(openTitle()).toBe("Alpha (edited)");
  });

  describe("edge cases", () => {
    it("opening the project that is already open changes nothing", async () => {
      await seedTwoProjects();
      useProjectStore.getState().setMetadata({ title: "Unsaved change" });
      await openProject("a");
      expect(openTitle()).toBe("Unsaved change");
    });

    it("an unknown id rejects and keeps the open project", async () => {
      await seedTwoProjects();
      await expect(openProject("missing")).rejects.toThrow();
      expect(openProjectIdSnapshot()).toBe("a");
      expect(openTitle()).toBe("Alpha");
    });
  });

  describe("invariants", () => {
    it("the last of two quick switches wins", async () => {
      await seedTwoProjects();
      await seedStoredProject("c", { project: songTitled("Charlie") });
      const first = openProject("b");
      await openProject("c");
      await first;
      expect(openProjectIdSnapshot()).toBe("c");
      expect(openTitle()).toBe("Charlie");
    });

    it("the stores hold no history from the previous project", async () => {
      await seedTwoProjects();
      useProjectStore.getState().setLinesWithHistory(useProjectStore.getState().lines);
      expect(useProjectStore.getState().history.length).toBeGreaterThan(0);
      await openProject("b");
      expect(useProjectStore.getState().history).toEqual([]);
      expect(useProjectStore.getState().isDirty).toBe(false);
    });

    it("A, B, A: the most recently requested target wins, even back to the project already open", async () => {
      await seedTwoProjects();
      useProjectStore.getState().setMetadata({ title: "Unsaved change" });
      const switchingToB = openProject("b");
      await openProject("a");
      await switchingToB;
      expect(openProjectIdSnapshot()).toBe("a");
      expect(openTitle()).toBe("Unsaved change");
    });
  });

  describe("supersession", () => {
    it("a superseded open of a missing id resolves quietly instead of rejecting", async () => {
      await seedTwoProjects();
      const superseded = openProject("missing");
      await openProject("b");
      await expect(superseded).resolves.toBeUndefined();
      expect(openProjectIdSnapshot()).toBe("b");
    });

    it("a failed open does not cancel an in-flight legitimate switch", async () => {
      await seedTwoProjects();
      const switchingToB = openProject("b");
      await expect(openProject("missing")).rejects.toThrow();
      await switchingToB;
      expect(openProjectIdSnapshot()).toBe("b");
      expect(openTitle()).toBe("Bravo");
    });
  });
});
