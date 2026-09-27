import { indexEntry } from "@/test/index-entries";
import { render } from "@/test/render";
import { ProjectRow } from "@/views/library/project-row";
import { describe, expect, it } from "vitest";

// -- Constants ----------------------------------------------------------------

const NOW = new Date(2026, 8, 27, 12, 0, 0).getTime();

// -- Helpers ------------------------------------------------------------------

function renderRow(overrides: Parameters<typeof indexEntry>[1] = {}) {
  return render(
    <ul>
      <ProjectRow
        project={indexEntry("p01", {
          title: "Midnight City",
          artists: ["M83"],
          album: "Hurry Up, We're Dreaming",
          lineCount: 38,
          syncedLineCount: 23,
          hasWordTiming: true,
          audioKind: "file",
          audioFileName: "midnight.flac",
          storedAudioBytes: 43_830_067,
          updatedAt: NOW - 12 * 60_000,
          ...overrides,
        })}
        now={NOW}
        isSelected={false}
        isMenuOpen={false}
        onOpen={() => {}}
        onToggleSelect={() => {}}
        onOpenMenu={() => {}}
      />
    </ul>,
  );
}

// -- Tests --------------------------------------------------------------------

describe("ProjectRow", () => {
  it("shows the title, artist, album, progress, audio and edited time", async () => {
    const screen = await renderRow();
    await expect.element(screen.getByRole("button", { name: "Midnight City", exact: true })).toBeInTheDocument();
    await expect.element(screen.getByText("M83")).toBeInTheDocument();
    await expect.element(screen.getByText("Hurry Up, We're Dreaming")).toBeInTheDocument();
    await expect
      .element(screen.getByRole("progressbar", { name: "23 of 38 lines synced, word by word" }))
      .toBeInTheDocument();
    await expect.element(screen.getByText("61%")).toBeInTheDocument();
    await expect.element(screen.getByText("FLAC")).toBeInTheDocument();
    await expect.element(screen.getByText("12 min ago")).toBeInTheDocument();
  });

  it("shows a check for a synced project", async () => {
    const screen = await renderRow({ syncedLineCount: 38 });
    await expect.element(screen.getByRole("img", { name: "Synced" })).toBeInTheDocument();
  });

  it("names its checkbox and menu button after the project", async () => {
    const screen = await renderRow();
    await expect.element(screen.getByRole("checkbox", { name: "Select Midnight City" })).toBeInTheDocument();
    const menu = screen.getByRole("button", { name: "More actions for Midnight City" });
    await expect.element(menu).toHaveAttribute("aria-haspopup", "menu");
    await expect.element(menu).toHaveAttribute("aria-expanded", "false");
  });

  describe("edge cases", () => {
    it("falls back for a missing artist, album, title and lyrics", async () => {
      const screen = await renderRow({ title: "", artists: [], album: "", lineCount: 0, syncedLineCount: 0 });
      await expect.element(screen.getByRole("button", { name: "Untitled", exact: true })).toBeInTheDocument();
      await expect.element(screen.getByText("No artist")).toBeInTheDocument();
      await expect.element(screen.getByText("No album")).toBeInTheDocument();
      await expect.element(screen.getByText("No lyrics yet")).toBeInTheDocument();
    });

    it("joins several artists", async () => {
      const screen = await renderRow({ artists: ["Lady Gaga", "Bruno Mars"] });
      await expect.element(screen.getByText("Lady Gaga, Bruno Mars")).toBeInTheDocument();
    });
  });

  describe("invariants", () => {
    it("marks its selected and menu states on the row for styling", async () => {
      const screen = await render(
        <ul>
          <ProjectRow
            project={indexEntry("p01")}
            now={NOW}
            isSelected
            isMenuOpen
            onOpen={() => {}}
            onToggleSelect={() => {}}
            onOpenMenu={() => {}}
          />
        </ul>,
      );
      const row = screen.container.querySelector("li");
      expect(row?.hasAttribute("data-selected")).toBe(true);
      expect(row?.hasAttribute("data-menu")).toBe(true);
      expect(row?.getAttribute("data-project-id")).toBe("p01");
    });
  });
});
