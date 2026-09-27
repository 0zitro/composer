import { useProjectChannel } from "@/hooks/useProjectChannel";
import { createProject, openProject, restoreOpenProject } from "@/lib/open-project";
import { openProjectIdSnapshot } from "@/lib/open-project-session";
import { PROJECT_CHANNEL_NAME } from "@/lib/project-channel";
import { listProjectIndex } from "@/lib/project-repository";
import { loadProjectRecord } from "@/lib/project-storage";
import { useProjectStore } from "@/stores/project";
import { seedStoredProject, songTitled } from "@/test/projects";
import { render } from "@/test/render";
import { nanoid } from "nanoid";
import { Toaster } from "sonner";
import { afterEach, describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

const ChannelHost: React.FC = () => {
  useProjectChannel();
  return <Toaster />;
};

const openChannels: BroadcastChannel[] = [];

function deleteInOtherTab(ids: string[]): void {
  const channel = new BroadcastChannel(PROJECT_CHANNEL_NAME);
  openChannels.push(channel);
  channel.postMessage({ type: "projects-deleted", ids, sender: "another-tab" });
}

async function openAlpha(): Promise<void> {
  await seedStoredProject("a", { open: true, project: songTitled("Alpha") });
  await restoreOpenProject();
}

async function seedBravo(): Promise<void> {
  await seedStoredProject("b", { project: songTitled("Bravo") });
}

function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) => candidate.textContent === text);
  if (!button) throw new Error(`button not found: ${text}`);
  return button;
}

// -- Tests --------------------------------------------------------------------

describe("useProjectChannel", () => {
  afterEach(() => {
    for (const channel of openChannels.splice(0)) channel.close();
  });

  it("warns when the open project is deleted in another tab", async () => {
    await openAlpha();
    const screen = await render(<ChannelHost />);
    deleteInOtherTab(["a"]);
    await expect.element(screen.getByText("This project was deleted in another tab")).toBeInTheDocument();
    await expect.element(screen.getByText("Changes here are not being saved.")).toBeInTheDocument();
  });

  it("Keep as new project saves what is on screen under a new id", async () => {
    await openAlpha();
    const screen = await render(<ChannelHost />);
    deleteInOtherTab(["a"]);
    await screen.getByRole("button", { name: "Keep as new project" }).click();
    await expect.poll(openProjectIdSnapshot).not.toBe("a");
    const id = openProjectIdSnapshot() ?? "";
    await expect.poll(async () => (await loadProjectRecord(id))?.metadata.title).toBe("Alpha");
    expect(useProjectStore.getState().metadata.title).toBe("Alpha");
  });

  describe("edge cases", () => {
    it("stays quiet when another project is deleted", async () => {
      await openAlpha();
      const screen = await render(<ChannelHost />);
      deleteInOtherTab(["b"]);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(screen.container.textContent).not.toContain("deleted in another tab");
    });

    it("Keep as new project adds the kept copy next to the existing projects", async () => {
      await openAlpha();
      const screen = await render(<ChannelHost />);
      deleteInOtherTab(["a"]);
      await screen.getByRole("button", { name: "Keep as new project" }).click();
      await expect.poll(async () => (await listProjectIndex()).length).toBe(2);
    });

    it("shows one toast when the same project is announced deleted twice", async () => {
      const id = nanoid();
      await seedStoredProject(id, { open: true, project: songTitled("Alpha") });
      await restoreOpenProject();
      const screen = await render(<ChannelHost />);
      deleteInOtherTab([id]);
      deleteInOtherTab([id]);
      await expect.element(screen.getByText("This project was deleted in another tab")).toBeInTheDocument();
      await new Promise((resolve) => setTimeout(resolve, 50));
      const noticesForThisProject = Array.from(screen.container.querySelectorAll("[data-sonner-toast]")).filter(
        (node) => node.textContent?.includes("This project was deleted in another tab"),
      );
      expect(noticesForThisProject).toHaveLength(1);
    });
  });

  describe("regressions", () => {
    it("regression: switching to another project dismisses the notice for the deleted one", async () => {
      await openAlpha();
      await seedBravo();
      const screen = await render(<ChannelHost />);
      deleteInOtherTab(["a"]);
      await expect.element(screen.getByText("This project was deleted in another tab")).toBeInTheDocument();
      await openProject("b");
      await expect.element(screen.getByText("This project was deleted in another tab")).not.toBeInTheDocument();
    });

    it("regression: switching away from the deleted project makes Keep as new project a no-op", async () => {
      await openAlpha();
      const screen = await render(<ChannelHost />);
      deleteInOtherTab(["a"]);
      await expect.element(screen.getByRole("button", { name: "Keep as new project" })).toBeInTheDocument();
      createProject();
      useProjectStore.getState().setMetadata({ title: "Should not be saved" });
      findButtonByText(screen.container, "Keep as new project").click();
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(await listProjectIndex()).toHaveLength(1);
    });
  });
});
