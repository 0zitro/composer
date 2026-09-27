import { DEFAULT_AGENTS } from "@/domain/agent/colors";
import { restoreOpenProject } from "@/lib/open-project";
import { openProjectIdSnapshot } from "@/lib/open-project-session";
import { schedulePendingDeletion } from "@/lib/pending-deletions";
import { debouncedSave, flushPendingSave } from "@/lib/persistence-debounce";
import { type ProjectFile, projectFileFrom } from "@/lib/project-file";
import { importProjectFile, replaceProjectFromFile } from "@/lib/project-import";
import { listProjectIndex, removeProjectData } from "@/lib/project-repository";
import { loadProjectRecord } from "@/lib/project-storage";
import { ProjectDeletedError } from "@/lib/project-tombstones";
import { SAVED_PROJECT_VERSION } from "@/lib/saved-project";
import { getSaveStatus } from "@/lib/save-status";
import { useImportConflictStore } from "@/stores/import-conflict-store";
import { useProjectStore } from "@/stores/project";
import { useSettingsStore } from "@/stores/settings";
import { allowConsole } from "@/test/console-guard";
import { createLine } from "@/test/factories";
import { render } from "@/test/render";
import { saveArgsTitled, seedStoredProject, songTitled, storedProject } from "@/test/projects";
import { ImportConflictModalHost } from "@/ui/projects/import-conflict-modal";
import { Toaster } from "sonner";
import { describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

function fileFor(projectId: string | undefined, title: string): File {
  const project = storedProject({ ...songTitled(title), lines: [createLine({ text: `${title} line` })] });
  return new File([JSON.stringify(projectFileFrom(projectId, project))], `${title}.ttml-project.json`);
}

function fileWithLine(text: string): ProjectFile {
  return {
    version: SAVED_PROJECT_VERSION,
    savedAt: Date.now(),
    metadata: { title: "File", artists: [], album: "", duration: 0 },
    agents: DEFAULT_AGENTS,
    lines: [createLine({ text })],
    granularity: "word",
  };
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

    it("regression: falls back to importing as a new project when the replace target is deleted while the conflict dialog is open", async () => {
      allowConsole(/no longer exists/);
      await seedStoredProject("a", { project: songTitled("Alpha") });
      const pending = importProjectFile(fileFor("a", "Alpha"));
      await expect.poll(() => useImportConflictStore.getState().conflict).not.toBeNull();
      await removeProjectData("a");
      useImportConflictStore.getState().answer("replace");
      const id = await pending;
      expect(id).not.toBeNull();
      expect(id).not.toBe("a");
      expect(await loadProjectRecord("a")).toBeUndefined();
      expect((await loadProjectRecord(id as string))?.metadata.title).toBe("Alpha");
    });

    it("regression: a second import while a conflict prompt is open shows a toast and does not proceed", async () => {
      allowConsole(/a conflict prompt is already open/);
      await seedStoredProject("a", { project: songTitled("Alpha") });
      const screen = await render(<Toaster />);
      const first = importProjectFile(fileFor("a", "Alpha"));
      await expect.poll(() => useImportConflictStore.getState().conflict).not.toBeNull();
      const second = importProjectFile(fileFor("a", "Alpha"));
      expect(await second).toBeNull();
      await expect.element(screen.getByText("Finish the current import first")).toBeInTheDocument();
      useImportConflictStore.getState().answer("cancel");
      await first;
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
      await render(<ImportConflictModalHost />);
      await importProjectFile(fileFor(undefined, "Solo"));
      expect(document.querySelector("dialog")).toBeNull();
    });
  });
});

describe("replaceProjectFromFile", () => {
  it("flushes the open project's pending save before replacing, leaving no later overwrite", async () => {
    await seedStoredProject("a", {
      open: true,
      project: { ...songTitled("Alpha"), lines: [createLine({ text: "Library line", begin: 1, end: 2 })] },
    });
    await restoreOpenProject();
    useSettingsStore.setState({ autoSaveDelay: 60_000 });
    debouncedSave(...saveArgsTitled("StaleEdit"));

    await replaceProjectFromFile("a", fileWithLine("File line"));

    expect((await loadProjectRecord("a"))?.lines[0]?.text).toBe("File line");
    await flushPendingSave();
    expect((await loadProjectRecord("a"))?.lines[0]?.text).toBe("File line");
  });

  describe("regressions", () => {
    it("regression: a failed flush stops the replace write and marks the save as failed instead of silently dropping the edit", async () => {
      await seedStoredProject("a", { open: true, project: songTitled("Alpha") });
      await restoreOpenProject();
      useSettingsStore.setState({ autoSaveDelay: 60_000 });
      debouncedSave(...saveArgsTitled("StaleEdit"));
      await removeProjectData("a");

      await expect(replaceProjectFromFile("a", fileWithLine("File line"))).rejects.toBeInstanceOf(ProjectDeletedError);
      expect(getSaveStatus()).toBe("failed");
      expect(await loadProjectRecord("a")).toBeUndefined();
    });
  });
});
