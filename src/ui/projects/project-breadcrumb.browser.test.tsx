import { restoreOpenProject } from "@/lib/open-project";
import { openProjectIdSnapshot } from "@/lib/open-project-session";
import { useProjectStore } from "@/stores/project";
import { useUIStore } from "@/stores/ui";
import { render } from "@/test/render";
import { seedStoredProject, songTitled } from "@/test/projects";
import { ProjectBreadcrumb } from "@/ui/projects/project-breadcrumb";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

// -- Helpers ------------------------------------------------------------------

async function seedTwo(): Promise<void> {
  await seedStoredProject("a", { open: true, project: { ...songTitled("Alpha"), savedAt: 10 } });
  await seedStoredProject("b", { project: { ...songTitled("Bravo"), savedAt: 20 } });
  await restoreOpenProject();
}

// -- Tests --------------------------------------------------------------------

describe("ProjectBreadcrumb", () => {
  it("shows the open project's title in the switch trigger", async () => {
    await seedTwo();
    const screen = await render(<ProjectBreadcrumb />);
    await expect.element(screen.getByRole("button", { name: "Alpha, switch project" })).toBeInTheDocument();
    await expect.element(screen.getByRole("navigation", { name: "Project" })).toBeInTheDocument();
  });

  it("clicking the title opens the switcher with the search focused", async () => {
    await seedTwo();
    const screen = await render(<ProjectBreadcrumb />);
    const trigger = screen.getByRole("button", { name: /switch project/ });
    await trigger.click();
    await expect.element(screen.getByRole("dialog", { name: "Switch project" })).toBeInTheDocument();
    await expect.element(screen.getByRole("combobox", { name: "Search projects" })).toHaveFocus();
    await expect.element(trigger).toHaveAttribute("aria-expanded", "true");
    expect(useUIStore.getState().projectSwitcherOpen).toBe(true);
  });

  it("the Projects crumb opens the switcher", async () => {
    await seedTwo();
    const screen = await render(<ProjectBreadcrumb />);
    await screen.getByRole("button", { name: "Projects" }).click();
    await expect.element(screen.getByRole("dialog", { name: "Switch project" })).toBeInTheDocument();
  });

  it("opens when the store asks, as Mod+O does", async () => {
    await seedTwo();
    const screen = await render(<ProjectBreadcrumb />);
    useUIStore.getState().setProjectSwitcherOpen(true);
    await expect.element(screen.getByRole("dialog", { name: "Switch project" })).toBeInTheDocument();
  });

  it("choosing a project switches to it and closes the switcher", async () => {
    await seedTwo();
    const screen = await render(<ProjectBreadcrumb />);
    await screen.getByRole("button", { name: /switch project/ }).click();
    await screen.getByRole("option", { name: /Bravo/ }).click();
    await expect.poll(openProjectIdSnapshot).toBe("b");
    expect(useUIStore.getState().projectSwitcherOpen).toBe(false);
    await expect.element(screen.getByRole("button", { name: "Bravo, switch project" })).toBeInTheDocument();
  });

  describe("keyboard", () => {
    it("Escape closes the switcher and returns focus to the trigger", async () => {
      await seedTwo();
      const screen = await render(<ProjectBreadcrumb />);
      const trigger = screen.getByRole("button", { name: /switch project/ });
      await trigger.click();
      await expect.element(screen.getByRole("combobox", { name: "Search projects" })).toHaveFocus();
      await userEvent.keyboard("{Escape}");
      await expect.poll(() => useUIStore.getState().projectSwitcherOpen).toBe(false);
      await expect.element(trigger).toHaveFocus();
    });

    it("Enter on the trigger opens the switcher", async () => {
      await seedTwo();
      const screen = await render(<ProjectBreadcrumb />);
      screen
        .getByRole("button", { name: /switch project/ })
        .element()
        .focus();
      await userEvent.keyboard("{Enter}");
      await expect.element(screen.getByRole("dialog", { name: "Switch project" })).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("names a project without a title Untitled", async () => {
      const screen = await render(<ProjectBreadcrumb />);
      await expect.element(screen.getByRole("button", { name: "Untitled, switch project" })).toBeInTheDocument();
    });

    it("follows title edits in the open project", async () => {
      await seedTwo();
      const screen = await render(<ProjectBreadcrumb />);
      useProjectStore.getState().setMetadata({ title: "Alpha (live)" });
      await expect.element(screen.getByRole("button", { name: "Alpha (live), switch project" })).toBeInTheDocument();
    });
  });
});
