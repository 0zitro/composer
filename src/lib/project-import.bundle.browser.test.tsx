import { openProjectIdSnapshot } from "@/lib/open-project-session";
import { schedulePendingDeletion } from "@/lib/pending-deletions";
import { buildProjectBundle } from "@/lib/project-bundle";
import { importProjectFile } from "@/lib/project-import";
import { listProjectIndex, removeProjectData } from "@/lib/project-repository";
import { loadProjectRecord } from "@/lib/project-storage";
import { render } from "@/test/render";
import { seedStoredProject, songTitled, storedProject } from "@/test/projects";
import { Toaster } from "sonner";
import { describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

function backupOf(...projects: [id: string, title: string, savedAt?: number][]): File {
  const bundle = buildProjectBundle(
    projects.map(([id, title, savedAt = 1_758_000_000_000]) => ({
      id,
      project: storedProject({ ...songTitled(title), savedAt }),
    })),
    1_759_000_000_000,
  );
  return new File([JSON.stringify(bundle)], "composer-backup-2026-09-27.ttml-projects.json");
}

async function titles(): Promise<string[]> {
  return (await listProjectIndex()).map((entry) => entry.title).toSorted();
}

// -- Tests --------------------------------------------------------------------

describe("importProjectFile · backups", () => {
  it("restores every project with its id and its saved time, and opens none", async () => {
    const screen = await render(<Toaster />);
    expect(await importProjectFile(backupOf(["a", "Alpha", 1_758_000_000_001], ["b", "Bravo"]))).toBeNull();
    expect(await titles()).toEqual(["Alpha", "Bravo"]);
    expect((await loadProjectRecord("a"))?.savedAt).toBe(1_758_000_000_001);
    expect(openProjectIdSnapshot()).toBeUndefined();
    await expect.element(screen.getByText("Restored 2 projects")).toBeInTheDocument();
  });

  it("skips projects already in the library and says so", async () => {
    await seedStoredProject("a", { project: songTitled("Alpha here") });
    const screen = await render(<Toaster />);
    await importProjectFile(backupOf(["a", "Alpha old"], ["b", "Bravo"]));
    expect(await titles()).toEqual(["Alpha here", "Bravo"]);
    await expect.element(screen.getByText("Restored 1 project")).toBeInTheDocument();
    await expect.element(screen.getByText("1 already in your library.")).toBeInTheDocument();
  });

  it("says when every project is already there", async () => {
    await seedStoredProject("a", { project: songTitled("Alpha") });
    const screen = await render(<Toaster />);
    await importProjectFile(backupOf(["a", "Alpha"]));
    await expect
      .element(screen.getByText("Every project in this backup is already in your library"))
      .toBeInTheDocument();
  });

  describe("regressions", () => {
    it("regression: a project deleted on this device comes back under a new id, never under the deleted one", async () => {
      await seedStoredProject("gone", { project: songTitled("Gone") });
      await removeProjectData("gone");
      await render(<Toaster />);
      await importProjectFile(backupOf(["gone", "Gone"]));
      const entries = await listProjectIndex();
      expect(entries.map((entry) => entry.title)).toEqual(["Gone"]);
      expect(entries[0]?.id).not.toBe("gone");
    });

    it("regression: a project waiting to be deleted is restored as a copy that survives the delete", async () => {
      await seedStoredProject("pending", { project: songTitled("Pending") });
      const deletion = schedulePendingDeletion(["pending"]);
      await render(<Toaster />);
      await importProjectFile(backupOf(["pending", "Pending"]));
      await deletion.commit();
      const entries = await listProjectIndex();
      expect(entries.map((entry) => entry.title)).toEqual(["Pending"]);
      expect(entries[0]?.id).not.toBe("pending");
    });
  });

  describe("edge cases", () => {
    it("says when nothing in the backup could be read", async () => {
      const screen = await render(<Toaster />);
      const empty = new File([JSON.stringify(buildProjectBundle([], 1))], "empty.ttml-projects.json");
      await importProjectFile(empty);
      await expect.element(screen.getByText("Couldn't read any project in that backup")).toBeInTheDocument();
    });
  });
});
