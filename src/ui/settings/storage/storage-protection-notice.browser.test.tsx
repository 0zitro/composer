import { render } from "@/test/render";
import { StorageProtectionNotice } from "@/ui/settings/storage/storage-protection-notice";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

describe("StorageProtectionNotice", () => {
  it("confirms protected storage", async () => {
    const screen = await render(<StorageProtectionNotice status="protected" onProtect={() => {}} />);
    await expect.element(screen.getByText("Protected from browser cleanup")).toBeInTheDocument();
    await expect
      .element(screen.getByText("The browser won't clear your projects when disk space runs low."))
      .toBeInTheDocument();
    expect(screen.getByRole("button").elements()).toHaveLength(0);
  });

  it("warns about unprotected storage and asks again", async () => {
    let asked = 0;
    const screen = await render(<StorageProtectionNotice status="unprotected" onProtect={() => asked++} />);
    await expect.element(screen.getByText("Not protected")).toBeInTheDocument();
    await expect
      .element(screen.getByText("The browser can clear your projects, lyrics included, when disk space runs low."))
      .toBeInTheDocument();
    await screen.getByRole("button", { name: "Protect storage" }).click();
    expect(asked).toBe(1);
  });

  it("asks again from the keyboard", async () => {
    let asked = 0;
    await render(<StorageProtectionNotice status="unprotected" onProtect={() => asked++} />);
    await userEvent.keyboard("{Tab}{Enter}");
    expect(asked).toBe(1);
  });

  describe("edge cases", () => {
    it("warns without a button when the browser cannot protect storage", async () => {
      const screen = await render(<StorageProtectionNotice status="unsupported" onProtect={() => {}} />);
      await expect.element(screen.getByText("Not protected")).toBeInTheDocument();
      expect(screen.getByRole("button").elements()).toHaveLength(0);
    });

    it("shows nothing until the status is known", async () => {
      const screen = await render(<StorageProtectionNotice status={undefined} onProtect={() => {}} />);
      expect(screen.container.textContent).toBe("");
    });
  });
});
