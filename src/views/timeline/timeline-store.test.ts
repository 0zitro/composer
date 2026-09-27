import { beforeEach, describe, expect, it } from "vitest";
import { useTimelineStore } from "@/views/timeline/timeline-store";

describe("rollingEditMode", () => {
  it("defaults to off and toggles", () => {
    useTimelineStore.setState({ rollingEditMode: false });
    expect(useTimelineStore.getState().rollingEditMode).toBe(false);
    useTimelineStore.getState().toggleRollingEditMode();
    expect(useTimelineStore.getState().rollingEditMode).toBe(true);
  });
});

describe("markerMode", () => {
  beforeEach(() => {
    useTimelineStore.setState({ markerMode: false });
  });

  it("defaults to false", () => {
    expect(useTimelineStore.getState().markerMode).toBe(false);
  });

  it("toggleMarkerMode flips it", () => {
    useTimelineStore.getState().toggleMarkerMode();
    expect(useTimelineStore.getState().markerMode).toBe(true);
  });

  describe("invariants", () => {
    it("toggling twice returns to false", () => {
      const s = useTimelineStore.getState();
      s.toggleMarkerMode();
      s.toggleMarkerMode();
      expect(useTimelineStore.getState().markerMode).toBe(false);
    });
  });
});

describe("resetProjectScope", () => {
  it("clears the selection, menus, word editing, paste mode and scroll", () => {
    const store = useTimelineStore.getState();
    store.setSelectedWords([{ lineId: "l1", lineIndex: 0, wordIndex: 0, type: "word" }]);
    store.setContextMenu({ x: 1, y: 2, target: { kind: "gutter", lineId: "l1", lineIndex: 0 } });
    store.setEditingWord({ lineId: "l1", wordIndex: 0, type: "word" });
    store.setScrollLeft(240);
    store.resetProjectScope();
    const state = useTimelineStore.getState();
    expect(state.selectedWords).toEqual([]);
    expect(state.contextMenu).toBeNull();
    expect(state.editingWord).toBeNull();
    expect(state.pasteMode).toEqual({ status: "idle" });
    expect(state.scrollLeft).toBe(0);
  });

  describe("invariants", () => {
    it("keeps view preferences such as zoom", () => {
      useTimelineStore.getState().setZoom(140);
      useTimelineStore.getState().resetProjectScope();
      expect(useTimelineStore.getState().zoom).toBe(140);
    });
  });
});
