import { afterEach, describe, expect, it } from "vitest";
import { useShortcutBindingsStore } from "@/stores/shortcut-bindings";
import { render } from "@/test/render";
import { SyncSection } from "@/ui/help-sections/syncing";

describe("SyncSection", () => {
  afterEach(() => {
    useShortcutBindingsStore.setState({ overrides: {} });
  });

  it("renders the section content", async () => {
    const screen = await render(<SyncSection />);
    await expect.element(screen.getByRole("heading", { name: "Tap (Space)" })).toBeInTheDocument();
  });

  it("renders inline shortcut key badges", async () => {
    const screen = await render(<SyncSection />);
    await expect.poll(() => screen.container.querySelectorAll("[data-inline-key-badge]").length).toBeGreaterThan(0);
  });

  it("documents the per-word syllable splitter", async () => {
    const screen = await render(<SyncSection />);
    await expect.element(screen.getByRole("heading", { name: "Splitting syllables" })).toBeInTheDocument();
  });

  it("documents the caret keys, and reads them from the registry rather than the page", async () => {
    useShortcutBindingsStore.setState({ overrides: { "sync.nextWord": { key: "KeyJ", physical: true } } });

    const screen = await render(<SyncSection />);
    const showsKey = (key: string) =>
      Array.from(screen.container.querySelectorAll("[data-inline-key-badge]")).some((badge) => badge.textContent === key);

    await expect.element(screen.getByRole("heading", { name: "Moving the caret" })).toBeInTheDocument();
    await expect.poll(() => showsKey("J")).toBe(true);
  });
});
