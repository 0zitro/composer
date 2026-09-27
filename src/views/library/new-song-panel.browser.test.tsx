import { restoreOpenProject } from "@/lib/open-project";
import { openProjectIdSnapshot } from "@/lib/open-project-session";
import { projectFileFrom } from "@/lib/project-file";
import { loadProjectRecord } from "@/lib/project-storage";
import { useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { createAudioFile } from "@/test/audio-fixtures";
import { LocationProbe } from "@/test/location-probe";
import { render } from "@/test/render";
import { seedStoredProject, songTitled, storedProject } from "@/test/projects";
import { NewSongPanel } from "@/views/library/new-song-panel";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

// -- Helpers ------------------------------------------------------------------

async function renderPanel() {
  return render(
    <>
      <NewSongPanel />
      <LocationProbe />
    </>,
    { withRouter: true },
  );
}

// -- Tests --------------------------------------------------------------------

describe("NewSongPanel", () => {
  it("starts a dropped or chosen file in a new project and opens the editor", async () => {
    await seedStoredProject("a", { open: true, project: songTitled("Alpha") });
    await restoreOpenProject();
    const screen = await renderPanel();
    await userEvent.upload(screen.getByLabelText("Upload audio file"), createAudioFile("bravo.wav"));
    await expect.element(screen.getByRole("status", { name: "Current path" })).toHaveTextContent("/editor");
    expect(openProjectIdSnapshot()).not.toBe("a");
    const source = useAudioStore.getState().source;
    expect(source?.type === "file" ? source.file.name : null).toBe("bravo.wav");
    expect(useProjectStore.getState().metadata.title).toBe("bravo");
    expect((await loadProjectRecord("a"))?.metadata.title).toBe("Alpha");
  });

  it("starts a pasted YouTube link in a new project from the keyboard", async () => {
    const screen = await renderPanel();
    const field = screen.getByRole("textbox", { name: "Or paste a YouTube link" });
    await field.click();
    await userEvent.keyboard("https://www.youtube.com/watch?v=dX3k_QDnzHE{Enter}");
    await expect.element(screen.getByRole("status", { name: "Current path" })).toHaveTextContent("/editor");
    const source = useAudioStore.getState().source;
    expect(source?.type === "youtube" ? source.videoId : null).toBe("dX3k_QDnzHE");
    expect(openProjectIdSnapshot()).toBeDefined();
  });

  it("imports a project file and opens it", async () => {
    const screen = await renderPanel();
    const file = new File(
      [JSON.stringify(projectFileFrom(undefined, storedProject(songTitled("Imported"))))],
      "x.json",
    );
    await userEvent.upload(screen.getByLabelText("Import project file"), file);
    await expect.element(screen.getByRole("status", { name: "Current path" })).toHaveTextContent("/editor");
    expect(useProjectStore.getState().metadata.title).toBe("Imported");
  });

  describe("edge cases", () => {
    it("keeps Create disabled until something is typed", async () => {
      const screen = await renderPanel();
      await expect.element(screen.getByRole("button", { name: "Create" })).toBeDisabled();
      await expect.element(screen.getByText("Each song gets its own project.")).toBeInTheDocument();
    });
  });

  describe("error paths", () => {
    it("explains an invalid link and creates nothing", async () => {
      const screen = await renderPanel();
      await screen.getByRole("textbox", { name: "Or paste a YouTube link" }).fill("not a link");
      await screen.getByRole("button", { name: "Create" }).click();
      await expect
        .element(screen.getByRole("alert"))
        .toHaveTextContent("That doesn't look like a valid YouTube URL or ID");
      expect(openProjectIdSnapshot()).toBeUndefined();
      await expect.element(screen.getByRole("status", { name: "Current path" })).toHaveTextContent(/^\/$/);
    });
  });
});
