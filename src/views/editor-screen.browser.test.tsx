import { describe, expect, it } from "vitest";
import { useProjectStore } from "@/stores/project";
import { createLine } from "@/test/factories";
import { render } from "@/test/render";
import { EditorScreen } from "@/views/editor-screen";

describe("EditorScreen", () => {
  it("shows only the active tab's panel", async () => {
    useProjectStore.setState({ activeTab: "export", lines: [createLine({ text: "a", begin: 0, end: 1 })] });
    const screen = await render(<EditorScreen />, { withRouter: true });
    const exportPanel = screen.container.querySelector('[data-tour="export-panel"]') as HTMLElement | null;
    const importPanel = screen.container.querySelector('[data-tour="import-dropzone"]') as HTMLElement | null;
    expect(exportPanel?.checkVisibility()).toBe(true);
    expect(importPanel?.checkVisibility() ?? false).toBe(false);
  });

  it("switches panels when the tab bar is used from the keyboard", async () => {
    useProjectStore.setState({ activeTab: "import" });
    const screen = await render(<EditorScreen />, { withRouter: true });
    const editTab = screen.container.querySelector('[data-tour="tab-edit"]') as HTMLButtonElement;
    editTab.focus();
    editTab.click();
    expect(useProjectStore.getState().activeTab).toBe("edit");
  });
});
