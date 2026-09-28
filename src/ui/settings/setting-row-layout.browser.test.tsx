import { render } from "@/test/render";
import { SettingRowLayout } from "@/ui/settings/setting-row-layout";
import { describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

const LONG_DESCRIPTION =
  "How the Projects page shows your songs. The toggle on that page changes this too, and it wraps onto a second line.";

async function renderRow(width: number) {
  return render(
    <div style={{ width }}>
      <SettingRowLayout>
        <div data-testid="text">{LONG_DESCRIPTION}</div>
        <button type="button" data-testid="control" style={{ width: 140 }}>
          Control
        </button>
      </SettingRowLayout>
    </div>,
  );
}

// -- Tests --------------------------------------------------------------------

describe("SettingRowLayout", () => {
  it("puts the text and the control side by side", async () => {
    const screen = await renderRow(540);
    await expect.element(screen.getByTestId("text")).toBeInTheDocument();
    await expect.element(screen.getByTestId("control")).toBeInTheDocument();
  });

  describe("invariants", () => {
    it("keeps the text before the control", async () => {
      const screen = await renderRow(540);
      const row = screen.getByTestId("text").element().parentElement;
      expect([...(row?.children ?? [])].map((child) => child.getAttribute("data-testid"))).toEqual(["text", "control"]);
    });

    it("lets a caller override the spacing", async () => {
      const screen = await render(
        <SettingRowLayout className="py-0">
          <span>Label</span>
        </SettingRowLayout>,
      );
      const row = screen.getByText("Label").element().parentElement;
      expect(row?.className).toContain("py-0");
      expect(row?.className).not.toContain("py-3");
      expect(row?.className).toContain("gap-8");
    });
  });
});
