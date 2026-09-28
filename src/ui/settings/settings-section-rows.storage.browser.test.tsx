import { useSettingsStore } from "@/stores/settings";
import { render } from "@/test/render";
import { SettingsSectionRows } from "@/ui/settings/settings-section-rows";
import { describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

function setRangeValue(input: HTMLInputElement, value: number): void {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, String(value));
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

// -- Tests --------------------------------------------------------------------

describe("SettingsSectionRows (storage)", () => {
  it("shows the formatted auto-save delay", async () => {
    useSettingsStore.setState({ autoSaveDelay: 2000 });
    const screen = await render(<SettingsSectionRows section="storage" />);
    await expect.element(screen.getByText("2.0s")).toBeInTheDocument();
  });

  it("writes a new auto-save delay to the store on change", async () => {
    const screen = await render(<SettingsSectionRows section="storage" />);
    setRangeValue(screen.getByRole("slider").element() as HTMLInputElement, 5000);
    await expect.poll(() => useSettingsStore.getState().autoSaveDelay).toBe(5000);
  });

  it("wraps the usage panel and the protection notice in an Usage group", async () => {
    const screen = await render(<SettingsSectionRows section="storage" />);
    const usageGroup = screen.getByRole("region", { name: "Usage" });
    await expect.element(usageGroup).toBeInTheDocument();
    await expect.element(usageGroup.getByText("used on this device")).toBeInTheDocument();
  });

  it("leaves the auto-save delay row outside of any group", async () => {
    const screen = await render(<SettingsSectionRows section="storage" />);
    const autoSaveRow = screen.container.querySelector('[data-setting-id="autoSaveDelay"]');
    expect(autoSaveRow?.closest("section")).toBeNull();
  });
});
