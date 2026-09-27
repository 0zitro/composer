import { useProjectFileActions } from "@/hooks/useProjectFileActions";
import { restoreOpenProject } from "@/lib/open-project";
import { openProjectIdSnapshot } from "@/lib/open-project-session";
import { debouncedSave } from "@/lib/persistence-debounce";
import { listProjectIndex } from "@/lib/project-repository";
import { loadProjectRecord } from "@/lib/project-storage";
import { useProjectStore } from "@/stores/project";
import { useSettingsStore } from "@/stores/settings";
import { saveArgsTitled, seedStoredProject } from "@/test/projects";
import { sleep } from "@/test/async";
import { describe, expect, it } from "vitest";
import { renderHook } from "vitest-browser-react";

describe("useProjectFileActions · clear", () => {
  it("clearing deletes the open project and leaves a blank editor", async () => {
    useSettingsStore.setState({ confirmClearProject: false });
    await seedStoredProject("a", { open: true });
    await restoreOpenProject();
    const { result } = await renderHook(() => useProjectFileActions({ current: null }));
    await result.current.handleClearProject();
    expect(useProjectStore.getState().lines).toEqual([]);
    expect(await loadProjectRecord("a")).toBeUndefined();
    expect(openProjectIdSnapshot()).not.toBe("a");
  });

  it("clearing before anything was saved still leaves a blank editor", async () => {
    useSettingsStore.setState({ confirmClearProject: false });
    useProjectStore.getState().setMetadata({ title: "Unsaved" });
    const { result } = await renderHook(() => useProjectFileActions({ current: null }));
    await result.current.handleClearProject();
    expect(useProjectStore.getState().metadata.title).toBe("");
  });

  describe("regressions", () => {
    it("regression: clearing before anything was saved discards a pending save instead of persisting it", async () => {
      useSettingsStore.setState({ confirmClearProject: false, autoSaveDelay: 60_000 });
      debouncedSave(...saveArgsTitled("Unsaved"));
      const { result } = await renderHook(() => useProjectFileActions({ current: null }));
      await result.current.handleClearProject();
      await sleep(150);
      expect(await listProjectIndex()).toEqual([]);
    });
  });
});
