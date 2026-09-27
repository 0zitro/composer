import { indexEntry } from "@/test/index-entries";
import { render } from "@/test/render";
import { ProjectCard } from "@/views/library/project-card";
import { describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

// -- Helpers ------------------------------------------------------------------

function renderCard(overrides: Parameters<typeof indexEntry>[1] = {}, onOpen: (id: string) => void = () => {}) {
  return render(
    <div role="list">
      <ProjectCard
        project={indexEntry("p02", {
          title: "Espresso",
          artists: ["Sabrina Carpenter"],
          lineCount: 52,
          syncedLineCount: 26,
          audioKind: "youtube",
          ...overrides,
        })}
        now={Date.now()}
        isSelected={false}
        isMenuOpen={false}
        onOpen={onOpen}
        onToggleSelect={() => {}}
        onOpenMenu={() => {}}
      />
    </div>,
  );
}

// -- Tests --------------------------------------------------------------------

describe("ProjectCard", () => {
  it("shows the art, title, artist, bar, audio and percentage", async () => {
    const screen = await renderCard();
    await expect.element(screen.getByRole("listitem")).toBeInTheDocument();
    await expect.element(screen.getByRole("button", { name: "Espresso", exact: true })).toBeInTheDocument();
    await expect.element(screen.getByText("Sabrina Carpenter")).toBeInTheDocument();
    await expect.element(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
    await expect.element(screen.getByText("YouTube")).toBeInTheDocument();
    await expect.element(screen.getByText("50%")).toBeInTheDocument();
  });

  it("says Synced for a finished project", async () => {
    const screen = await renderCard({ syncedLineCount: 52 });
    await expect.element(screen.getByText("Synced")).toBeInTheDocument();
  });

  it("opens from the keyboard", async () => {
    const opened: string[] = [];
    await renderCard({}, (id) => opened.push(id));
    await userEvent.keyboard("{Tab}{Tab}{Tab}{Enter}");
    expect(opened).toEqual(["p02"]);
  });

  describe("edge cases", () => {
    it("says No lyrics for a project without lines", async () => {
      const screen = await renderCard({ lineCount: 0, syncedLineCount: 0 });
      await expect.element(screen.getByText("No lyrics")).toBeInTheDocument();
    });
  });
});
