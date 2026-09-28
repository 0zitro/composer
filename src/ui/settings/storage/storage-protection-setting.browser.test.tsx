import { render } from "@/test/render";
import { StorageProtectionSetting } from "@/ui/settings/storage/storage-protection-setting";
import { Toaster } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

// -- Helpers ------------------------------------------------------------------

async function browserStatus(): Promise<string> {
  return (await navigator.storage.persisted()) ? "protected" : "unprotected";
}

// -- Tests --------------------------------------------------------------------

describe("StorageProtectionSetting", () => {
  it("shows the browser's real protection status", async () => {
    const screen = await render(<StorageProtectionSetting />);
    const label = (await browserStatus()) === "protected" ? "Protected from browser cleanup" : "Not protected";
    await expect.element(screen.getByText(label)).toBeInTheDocument();
  });

  it("asks the browser to protect storage when the button is clicked", async () => {
    if ((await browserStatus()) === "protected") return;
    const persist = vi.spyOn(navigator.storage, "persist");
    const screen = await render(<StorageProtectionSetting />);
    await screen.getByRole("button", { name: "Protect storage" }).click();
    await expect.poll(() => persist.mock.calls.length).toBeGreaterThan(0);
  });

  it("asks the browser to protect storage from the keyboard", async () => {
    if ((await browserStatus()) === "protected") return;
    const persist = vi.spyOn(navigator.storage, "persist");
    const screen = await render(<StorageProtectionSetting />);
    const button = screen.getByRole("button", { name: "Protect storage" });
    await expect.element(button).toBeInTheDocument();
    (button.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.poll(() => persist.mock.calls.length).toBeGreaterThan(0);
  });

  describe("edge cases", () => {
    it("tells the user when the browser declines protection", async () => {
      if ((await browserStatus()) === "protected") return;
      const screen = await render(
        <>
          <Toaster />
          <StorageProtectionSetting />
        </>,
      );
      await screen.getByRole("button", { name: "Protect storage" }).click();
      if ((await browserStatus()) === "unprotected") {
        await expect.element(screen.getByText("Your browser didn't allow it this time.")).toBeInTheDocument();
      }
    });
  });
});
