import { hiddenProjectIdsSnapshot, schedulePendingDeletion } from "@/lib/pending-deletions";
import { loadProjectRecord } from "@/lib/project-storage";
import { render } from "@/test/render";
import { seedStoredProject } from "@/test/projects";
import { showDeletedProjectsToast } from "@/utils/project-toast";
import { Toaster } from "sonner";
import { describe, expect, it } from "vitest";

describe("showDeletedProjectsToast", () => {
  it("names a single project and offers Undo", async () => {
    await seedStoredProject("a");
    const screen = await render(<Toaster />);
    showDeletedProjectsToast(["Heat Waves"], schedulePendingDeletion(["a"]));
    await expect.element(screen.getByText("Deleted “Heat Waves”")).toBeInTheDocument();
    await screen.getByRole("button", { name: "Undo" }).click();
    expect(hiddenProjectIdsSnapshot().has("a")).toBe(false);
    expect(await loadProjectRecord("a")).toBeDefined();
  });

  it("counts several projects", async () => {
    const screen = await render(<Toaster />);
    showDeletedProjectsToast(["A", "B", "C"], schedulePendingDeletion(["a", "b", "c"]));
    await expect.element(screen.getByText("Deleted 3 projects")).toBeInTheDocument();
  });

  it("commits the delete when the toast is dismissed", async () => {
    await seedStoredProject("a");
    const screen = await render(<Toaster />);
    showDeletedProjectsToast(["Heat Waves"], schedulePendingDeletion(["a"]));
    await screen.getByRole("button", { name: "Close toast" }).click();
    await expect.poll(() => loadProjectRecord("a")).toBeUndefined();
  });

  describe("edge cases", () => {
    it("quotes the Untitled fallback for an empty title", async () => {
      const screen = await render(<Toaster />);
      showDeletedProjectsToast([""], schedulePendingDeletion(["a"]));
      await expect.element(screen.getByText("Deleted “Untitled”")).toBeInTheDocument();
    });
  });
});
