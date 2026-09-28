import { restoreOpenProject } from "@/lib/open-project";
import { seedStoredProject, songTitled } from "@/test/projects";
import { render } from "@/test/render";
import { ImportPanel } from "@/views/import";
import { describe, expect, it } from "vitest";

describe("ImportPanel · missing audio", () => {
  it("shows the relink state when the project's file is not on this device", async () => {
    await seedStoredProject("p", {
      open: true,
      project: { ...songTitled("City"), audioSource: { kind: "file", name: "city.wav" } },
    });
    await restoreOpenProject();
    const screen = await render(<ImportPanel />);
    await expect.element(screen.getByText("Not on this device. Your lyrics and timings are safe.")).toBeInTheDocument();
  });

  it("shows the normal drop zone for a project without audio", async () => {
    await seedStoredProject("p", { open: true, project: songTitled("Lyrics only") });
    await restoreOpenProject();
    const screen = await render(<ImportPanel />);
    await expect.element(screen.getByText("Drop audio file here")).toBeInTheDocument();
  });
});
