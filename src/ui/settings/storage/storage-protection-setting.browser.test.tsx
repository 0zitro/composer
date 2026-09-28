import { render } from "@/test/render";
import { StorageProtectionSetting } from "@/ui/settings/storage/storage-protection-setting";
import { Toaster } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

// -- Helpers ------------------------------------------------------------------

async function browserStatus(): Promise<"protected" | "unprotected"> {
  return (await navigator.storage.persisted()) ? "protected" : "unprotected";
}

async function assertProtectedNoticeShown(screen: Awaited<ReturnType<typeof render>>): Promise<void> {
  await expect.element(screen.getByText("Protected from browser cleanup")).toBeInTheDocument();
  expect(screen.getByRole("button").elements()).toHaveLength(0);
}

async function assertUnprotectedNoticeShown(screen: Awaited<ReturnType<typeof render>>): Promise<void> {
  await expect.element(screen.getByText("Not protected")).toBeInTheDocument();
  await expect.element(screen.getByRole("button", { name: "Protect storage" })).toBeInTheDocument();
}

// -- Tests --------------------------------------------------------------------

describe("StorageProtectionSetting", () => {
  it("shows the browser's real protection status", async () => {
    const screen = await render(<StorageProtectionSetting />);
    if ((await browserStatus()) === "protected") await assertProtectedNoticeShown(screen);
    else await assertUnprotectedNoticeShown(screen);
  });

  it("asks the browser to protect storage when the button is clicked", async () => {
    const persist = vi.spyOn(navigator.storage, "persist");
    const screen = await render(<StorageProtectionSetting />);
    if ((await browserStatus()) === "protected") {
      await assertProtectedNoticeShown(screen);
      return;
    }
    await assertUnprotectedNoticeShown(screen);
    await screen.getByRole("button", { name: "Protect storage" }).click();
    await expect.poll(() => persist.mock.calls.length).toBeGreaterThan(0);
  });

  it("asks the browser to protect storage from the keyboard", async () => {
    const persist = vi.spyOn(navigator.storage, "persist");
    const screen = await render(<StorageProtectionSetting />);
    if ((await browserStatus()) === "protected") {
      await assertProtectedNoticeShown(screen);
      return;
    }
    const button = screen.getByRole("button", { name: "Protect storage" });
    await expect.element(button).toBeInTheDocument();
    (button.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.poll(() => persist.mock.calls.length).toBeGreaterThan(0);
  });

  describe("edge cases", () => {
    it("tells the user the real outcome after asking for protection", async () => {
      const screen = await render(
        <>
          <Toaster />
          <StorageProtectionSetting />
        </>,
      );
      if ((await browserStatus()) === "protected") {
        await assertProtectedNoticeShown(screen);
        return;
      }
      await assertUnprotectedNoticeShown(screen);
      await screen.getByRole("button", { name: "Protect storage" }).click();
      if ((await browserStatus()) === "unprotected") {
        await expect.element(screen.getByText("Your browser didn't allow it this time.")).toBeInTheDocument();
      } else {
        await expect.element(screen.getByText("Protected from browser cleanup")).toBeInTheDocument();
      }
    });
  });
});
