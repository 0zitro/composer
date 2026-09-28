import { PROJECT_STORE_NAME, setInStore } from "@/lib/persistence-idb";
import { removeProjectData, saveProjectRecord, setOpenProjectId } from "@/lib/project-repository";
import { LEGACY_PROJECT_KEY } from "@/lib/project-storage";
import {
  downloadAllRecoverableProjects,
  downloadRecoverableProject,
  listRecoverableProjects,
  readRecoveryMetadata,
} from "@/lib/recovery";
import { captureDownloads } from "@/test/downloads";
import { songTitled, storedProject } from "@/test/projects";
import { describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

async function seed(id: string, title: string, savedAt: number): Promise<void> {
  await saveProjectRecord(id, storedProject({ ...songTitled(title), savedAt }));
}

// -- Tests --------------------------------------------------------------------

describe("recovery · every project", () => {
  it("lists every project newest first", async () => {
    await seed("a", "Alpha", 100);
    await seed("b", "Bravo", 300);
    await seed("c", "Charlie", 200);
    expect((await listRecoverableProjects()).map((project) => project.title)).toEqual(["Bravo", "Charlie", "Alpha"]);
  });

  it("downloads one project by its key", async () => {
    await seed("a", "Alpha", 100);
    await seed("b", "Bravo", 300);
    const downloads = captureDownloads();
    const result = await downloadRecoverableProject("a");
    downloads.stop();
    expect(result.title).toBe("Alpha");
    expect(downloads.names()[0]).toMatch(/^Alpha-\d{4}-\d{2}-\d{2}\.ttml-project\.json$/);
  });

  it("downloads every project as one bundle", async () => {
    await seed("a", "Alpha", 100);
    await seed("b", "Bravo", 300);
    const downloads = captureDownloads();
    expect(await downloadAllRecoverableProjects()).toBe(2);
    downloads.stop();
    expect(downloads.names()).toHaveLength(1);
    expect(downloads.names()[0]).toMatch(/^composer-backup-\d{4}-\d{2}-\d{2}\.ttml-projects\.json$/);
  });

  it("includes a legacy project that was never moved", async () => {
    await setInStore(PROJECT_STORE_NAME, LEGACY_PROJECT_KEY, storedProject(songTitled("Legacy")));
    expect((await listRecoverableProjects()).map((project) => [project.key, project.title])).toEqual([
      ["legacy", "Legacy"],
    ]);
  });

  describe("edge cases", () => {
    it("lists nothing and downloads nothing on an empty device", async () => {
      const downloads = captureDownloads();
      expect(await listRecoverableProjects()).toEqual([]);
      expect(await downloadAllRecoverableProjects()).toBe(0);
      expect((await downloadRecoverableProject("missing")).found).toBe(false);
      downloads.stop();
      expect(downloads.names()).toEqual([]);
    });

    it("skips deleted projects", async () => {
      await seed("a", "Alpha", 100);
      await removeProjectData("a");
      expect(await listRecoverableProjects()).toEqual([]);
    });
  });

  describe("regressions", () => {
    it("regression: finds the most recent project when no project is open", async () => {
      await seed("a", "Alpha", 100);
      await seed("b", "Bravo", 300);
      const result = await readRecoveryMetadata();
      expect(result.found).toBe(true);
      expect(result.title).toBe("Bravo");
    });

    it("still prefers the open project over a newer one", async () => {
      await seed("a", "Alpha", 100);
      await seed("b", "Bravo", 300);
      await setOpenProjectId("a");
      expect((await readRecoveryMetadata()).title).toBe("Alpha");
    });
  });
});
