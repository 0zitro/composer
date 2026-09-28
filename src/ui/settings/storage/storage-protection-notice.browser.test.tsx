import { render } from "@/test/render";
import { StorageProtectionNotice } from "@/ui/settings/storage/storage-protection-notice";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

describe("StorageProtectionNotice", () => {
  it("confirms protected storage", async () => {
    const screen = await render(<StorageProtectionNotice status="protected" browser="other" onProtect={() => {}} />);
    await expect.element(screen.getByText("Protected from browser cleanup")).toBeInTheDocument();
    await expect
      .element(screen.getByText("The browser won't clear your projects when disk space runs low."))
      .toBeInTheDocument();
    expect(screen.getByRole("button").elements()).toHaveLength(0);
  });

  it("warns about unprotected storage and asks again", async () => {
    let asked = 0;
    const screen = await render(
      <StorageProtectionNotice status="unprotected" browser="other" onProtect={() => asked++} />,
    );
    await expect.element(screen.getByText("Not protected")).toBeInTheDocument();
    await expect
      .element(screen.getByText("The browser can clear your projects, lyrics included, when disk space runs low."))
      .toBeInTheDocument();
    await screen.getByRole("button", { name: "Protect storage" }).click();
    expect(asked).toBe(1);
  });

  it("asks again from the keyboard", async () => {
    let asked = 0;
    await render(<StorageProtectionNotice status="unprotected" browser="other" onProtect={() => asked++} />);
    await userEvent.keyboard("{Tab}{Enter}");
    expect(asked).toBe(1);
  });

  describe("Chromium browsers", () => {
    it("shows concrete steps in place of the one-line description", async () => {
      const screen = await render(
        <StorageProtectionNotice status="unprotected" browser="chromium" onProtect={() => {}} />,
      );
      await expect.element(screen.getByText("Not protected")).toBeInTheDocument();
      await expect
        .element(screen.getByText("Your browser decides this on its own. Either of these usually works:"))
        .toBeInTheDocument();
      await expect.element(screen.getByRole("list")).toBeInTheDocument();
      expect(screen.getByRole("listitem").elements()).toHaveLength(2);
      await expect
        .element(
          screen.getByText("Install Composer as an app: browser menu > Cast, save, and share > Install page as app."),
        )
        .toBeInTheDocument();
      await expect.element(screen.getByText("Bookmark Composer and keep using it.")).toBeInTheDocument();
      await expect
        .element(screen.getByText("Then click Protect storage again. This doesn't work in Incognito."))
        .toBeInTheDocument();
      await expect.element(screen.getByRole("button", { name: "Protect storage" })).toBeInTheDocument();
    });

    it("still asks again when clicked", async () => {
      let asked = 0;
      const screen = await render(
        <StorageProtectionNotice status="unprotected" browser="chromium" onProtect={() => asked++} />,
      );
      await screen.getByRole("button", { name: "Protect storage" }).click();
      expect(asked).toBe(1);
    });

    it("asks again from the keyboard", async () => {
      let asked = 0;
      await render(<StorageProtectionNotice status="unprotected" browser="chromium" onProtect={() => asked++} />);
      await userEvent.keyboard("{Tab}{Enter}");
      expect(asked).toBe(1);
    });

    it("keeps the plain description when storage protection is unsupported", async () => {
      const screen = await render(
        <StorageProtectionNotice status="unsupported" browser="chromium" onProtect={() => {}} />,
      );
      await expect.element(screen.getByText("Not protected")).toBeInTheDocument();
      await expect
        .element(screen.getByText("The browser can clear your projects, lyrics included, when disk space runs low."))
        .toBeInTheDocument();
      expect(screen.getByRole("button").elements()).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    it("warns without a button when the browser cannot protect storage", async () => {
      const screen = await render(
        <StorageProtectionNotice status="unsupported" browser="other" onProtect={() => {}} />,
      );
      await expect.element(screen.getByText("Not protected")).toBeInTheDocument();
      expect(screen.getByRole("button").elements()).toHaveLength(0);
    });

    it("shows nothing until the status is known", async () => {
      const screen = await render(<StorageProtectionNotice status={undefined} browser="other" onProtect={() => {}} />);
      expect(screen.container.textContent).toBe("");
    });
  });
});
