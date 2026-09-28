import { useSettingsStore } from "@/stores/settings";
import { render } from "@/test/render";
import { SettingText } from "@/ui/settings/setting-text";
import { SettingsSearchQueryContext } from "@/ui/settings/settings-search-query";
import { describe, expect, it } from "vitest";

const marks = (container: HTMLElement) => [...container.querySelectorAll("mark")].map((mark) => mark.textContent);

describe("SettingText", () => {
  it("shows the catalog label and description", async () => {
    const screen = await render(<SettingText id="followPlayhead" />);
    await expect.element(screen.getByText("Follow playhead")).toBeInTheDocument();
    await expect
      .element(screen.getByText("Auto-scroll the timeline to keep the playhead visible."))
      .toBeInTheDocument();
  });

  it("highlights the search query in the label and the description", async () => {
    const screen = await render(
      <SettingsSearchQueryContext value="playhead">
        <SettingText id="followPlayhead" />
      </SettingsSearchQueryContext>,
    );
    expect(marks(screen.container)).toEqual(["playhead", "playhead"]);
  });

  describe("edge cases", () => {
    it("marks nothing without a query", async () => {
      const screen = await render(<SettingText id="followPlayhead" />);
      expect(marks(screen.container)).toEqual([]);
    });
  });

  describe("computed description", () => {
    it("recomputes the description when the entry declares one and the store changes", async () => {
      useSettingsStore.setState({ keepYouTubeAudio: "always" });
      const screen = await render(<SettingText id="keepYouTubeAudio" />);
      await expect
        .element(screen.getByText("YouTube audio is kept, so projects open offline. Cleanup can still remove it."))
        .toBeInTheDocument();
      useSettingsStore.setState({ keepYouTubeAudio: "never" });
      await expect
        .element(screen.getByText("YouTube audio is fetched each time you open a project."))
        .toBeInTheDocument();
    });
  });
});
