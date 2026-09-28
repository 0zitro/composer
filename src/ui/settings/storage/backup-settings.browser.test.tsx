import { listProjectIndex } from "@/lib/project-repository";
import { captureDownloads } from "@/test/downloads";
import { seedStoredProject, songTitled } from "@/test/projects";
import { render } from "@/test/render";
import { ConfirmModalHost } from "@/ui/confirm-modal";
import { BackupSettings } from "@/ui/settings/storage/backup-settings";
import { Toaster } from "sonner";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

// -- Helpers ------------------------------------------------------------------

function renderBackup(projectCount: number) {
  return render(
    <>
      <BackupSettings projectCount={projectCount} />
      <ConfirmModalHost />
      <Toaster />
    </>,
  );
}

// -- Tests --------------------------------------------------------------------

describe("BackupSettings", () => {
  it("backs up every project as one file", async () => {
    await seedStoredProject("a", { project: songTitled("Alpha") });
    const screen = await renderBackup(1);
    await expect
      .element(screen.getByText("Download every project's lyrics and timings as one file. Audio is not included."))
      .toBeInTheDocument();
    const downloads = captureDownloads();
    await screen.getByRole("button", { name: "Export all" }).click();
    await expect.poll(() => downloads.names().length).toBe(1);
    downloads.stop();
  });

  it("deletes every project after confirming", async () => {
    await seedStoredProject("a", { project: songTitled("Alpha") });
    await seedStoredProject("b", { project: songTitled("Bravo") });
    const screen = await renderBackup(2);
    await expect
      .element(screen.getByText("Remove every project and all stored audio from this device. This can't be undone."))
      .toBeInTheDocument();
    await screen.getByRole("button", { name: "Delete all" }).click();
    await expect.element(screen.getByText("Delete all projects?")).toBeInTheDocument();
    await expect
      .element(screen.getByText("This removes 2 projects and all stored audio from this device. This can't be undone."))
      .toBeInTheDocument();
    await screen.getByRole("dialog").getByRole("button", { name: "Delete all" }).click();
    await expect.poll(listProjectIndex).toEqual([]);
    await expect.element(screen.getByText("Deleted all projects")).toBeInTheDocument();
  });

  it("keeps everything when the confirm is cancelled from the keyboard", async () => {
    await seedStoredProject("a", { project: songTitled("Alpha") });
    const screen = await renderBackup(1);
    await screen.getByRole("button", { name: "Delete all" }).click();
    await expect
      .element(screen.getByText("This removes 1 project and all stored audio from this device. This can't be undone."))
      .toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await expect.poll(async () => (await listProjectIndex()).length).toBe(1);
  });

  describe("edge cases", () => {
    it("disables both actions with no projects", async () => {
      const screen = await renderBackup(0);
      await expect.element(screen.getByRole("button", { name: "Export all" })).toBeDisabled();
      await expect.element(screen.getByRole("button", { name: "Delete all" })).toBeDisabled();
    });
  });
});
