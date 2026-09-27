import { render } from "@/test/render";
import { RenameProjectModal } from "@/views/library/rename-project-modal";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

describe("RenameProjectModal", () => {
  it("starts with the title selected and renames on Enter", async () => {
    const renamed: string[] = [];
    const screen = await render(
      <RenameProjectModal title="Heat Waves" onRename={(title) => renamed.push(title)} onClose={() => {}} />,
    );
    const field = screen.getByRole("textbox", { name: "Project title" });
    await expect.element(field).toHaveFocus();
    await expect.element(field).toHaveValue("Heat Waves");
    await userEvent.keyboard("Heat Waves (Remix){Enter}");
    expect(renamed).toEqual(["Heat Waves (Remix)"]);
  });

  it("closes on Cancel and on Escape without renaming", async () => {
    const renamed: string[] = [];
    let closes = 0;
    const screen = await render(
      <RenameProjectModal title="Heat Waves" onRename={(title) => renamed.push(title)} onClose={() => closes++} />,
    );
    await screen.getByRole("button", { name: "Cancel" }).click();
    await userEvent.keyboard("{Escape}");
    expect(closes).toBe(2);
    expect(renamed).toEqual([]);
  });

  describe("edge cases", () => {
    it("starts with an empty title selected and still renames on Enter", async () => {
      const renamed: string[] = [];
      const screen = await render(
        <RenameProjectModal title="" onRename={(title) => renamed.push(title)} onClose={() => {}} />,
      );
      const field = screen.getByRole("textbox", { name: "Project title" });
      await expect.element(field).toHaveValue("");
      await userEvent.keyboard("New title{Enter}");
      expect(renamed).toEqual(["New title"]);
    });

    it("lets Backspace edit the text instead of triggering a library shortcut", async () => {
      const renamed: string[] = [];
      const screen = await render(
        <RenameProjectModal title="Heat Waves" onRename={(title) => renamed.push(title)} onClose={() => {}} />,
      );
      const field = screen.getByRole("textbox", { name: "Project title" });
      await userEvent.keyboard("{Backspace}{Enter}");
      expect(renamed).toEqual([""]);
      await expect.element(field).toBeInTheDocument();
    });

    it("keeps keys other than Escape from reaching a surrounding shortcut handler", async () => {
      const seenKeys: string[] = [];
      const screen = await render(
        <div onKeyDown={(event) => seenKeys.push(event.key)}>
          <RenameProjectModal title="Heat Waves" onRename={() => {}} onClose={() => {}} />
        </div>,
      );
      const field = screen.getByRole("textbox", { name: "Project title" });
      await field.click();
      await userEvent.keyboard("{Backspace}");
      expect(seenKeys).toEqual([]);
      await userEvent.keyboard("{Escape}");
      expect(seenKeys).toEqual(["Escape"]);
    });
  });
});
