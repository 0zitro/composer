import { adoptOpenProjectId, forgetOpenProjectId } from "@/lib/open-project-session";
import { setSavePending, trackSave } from "@/lib/save-status";
import { render } from "@/test/render";
import { SaveStatusLabel } from "@/ui/projects/save-status-label";
import { describe, expect, it } from "vitest";

describe("SaveStatusLabel", () => {
  it("says Saved for an open project with nothing pending", async () => {
    adoptOpenProjectId("p1");
    const screen = await render(<SaveStatusLabel />);
    await expect.element(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("says Saving while a save is pending, then Saved", async () => {
    adoptOpenProjectId("p1");
    const screen = await render(<SaveStatusLabel />);
    setSavePending(true);
    await expect.element(screen.getByRole("status")).toHaveTextContent("Saving");
    setSavePending(false);
    await expect.element(screen.getByRole("status")).toHaveTextContent("Saved");
  });

  it("says Not saved after a failed write", async () => {
    adoptOpenProjectId("p1");
    const screen = await render(<SaveStatusLabel />);
    await trackSave("project", Promise.reject(new Error("quota"))).catch(() => undefined);
    await expect.element(screen.getByRole("status")).toHaveTextContent("Not saved");
  });

  describe("edge cases", () => {
    it("renders nothing before the project has an id", async () => {
      forgetOpenProjectId();
      const screen = await render(<SaveStatusLabel />);
      expect(screen.container.querySelector('[role="status"]')).toBeNull();
    });

    it("appears once the project gets an id", async () => {
      const screen = await render(<SaveStatusLabel />);
      adoptOpenProjectId("p1");
      await expect.element(screen.getByRole("status")).toHaveTextContent("Saved");
    });
  });
});
