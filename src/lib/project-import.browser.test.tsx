import { restoreOpenProject } from "@/lib/open-project";
import { openProjectIdSnapshot } from "@/lib/open-project-session";
import { schedulePendingDeletion } from "@/lib/pending-deletions";
import { projectFileFrom } from "@/lib/project-file";
import { importProjectFile } from "@/lib/project-import";
import { listProjectIndex, removeProjectData } from "@/lib/project-repository";
import { loadProjectRecord } from "@/lib/project-storage";
import { useProjectStore } from "@/stores/project";
import { allowConsole } from "@/test/console-guard";
import { createLine } from "@/test/factories";
import { render } from "@/test/render";
import { seedStoredProject, songTitled, storedProject } from "@/test/projects";
import { ImportConflictModalHost } from "@/ui/projects/import-conflict-modal";
import { Toaster } from "sonner";
import { describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

function fileFor(projectId: string | undefined, title: string): File {
  const project = storedProject({ ...songTitled(title), lines: [createLine({ text: `${title} line` })] });
  return new File([JSON.stringify(projectFileFrom(projectId, project))], `${title}.ttml-project.json`);
}

// -- Tests --------------------------------------------------------------------

describe("importProjectFile", () => {
  it("imports a file with no match as a new project and opens it", async () => {
    await seedStoredProject("a", { open: true, project: songTitled("Alpha") });
    await restoreOpenProject();
    const id = await importProjectFile(fileFor(undefined, "Bravo"));
    expect(id).not.toBeNull();
    expect(id).not.toBe("a");
    expect(openProjectIdSnapshot()).toBe(id);
    expect(useProjectStore.getState().metadata.title).toBe("Bravo");
    expect((await loadProjectRecord(id as string))?.hasUnexportedImport).toBe(true);
    expect((await loadProjectRecord("a"))?.metadata.title).toBe("Alpha");
  });

  describe("regressions", () => {
    it("regression: a file whose project was deleted imports as a new project, never under the deleted id", async () => {
      await seedStoredProject("gone", { project: songTitled("Gone") });
      await removeProjectData("gone");
      const id = await importProjectFile(fileFor("gone", "Gone"));
      expect(id).not.toBe("gone");
      expect(await loadProjectRecord("gone")).toBeUndefined();
    });

    it("regression: a project pending deletion is not offered as a conflict", async () => {
      await seedStoredProject("a", { project: songTitled("Alpha") });
      const deletion = schedulePendingDeletion(["a"]);
      const id = await importProjectFile(fileFor("a", "Alpha"));
      expect(id).not.toBe("a");
      deletion.undo();
    });
  });

  describe("error paths", () => {
    it("says so and imports nothing when the file cannot be read", async () => {
      allowConsole(/could not read the project file/);
      const screen = await render(<Toaster />);
      const id = await importProjectFile(new File(["not json"], "broken.ttml-project.json"));
      expect(id).toBeNull();
      await expect.element(screen.getByText("Couldn't read that project file")).toBeInTheDocument();
      expect(await listProjectIndex()).toEqual([]);
    });
  });

  describe("invariants", () => {
    it("renders no conflict dialog when nothing matches", async () => {
      const screen = await render(<ImportConflictModalHost />);
      await importProjectFile(fileFor(undefined, "Solo"));
      expect(screen.container.querySelector("dialog")).toBeNull();
    });
  });
});
