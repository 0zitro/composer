import { create } from "zustand";

// -- Types --------------------------------------------------------------------

type SettingsHighlight = "bridge-section" | null;
type TtmlEditState = { source: string; content: string } | null;

interface UIState {
  settingsOpen: boolean;
  settingsHighlight: SettingsHighlight;
  ttmlEditState: TtmlEditState;
  projectSwitcherOpen: boolean;
}

interface UIActions {
  openSettings: (highlight?: SettingsHighlight) => void;
  closeSettings: () => void;
  clearHighlight: () => void;
  setTtmlEditState: (editState: TtmlEditState | ((current: TtmlEditState) => TtmlEditState)) => void;
  setProjectSwitcherOpen: (open: boolean) => void;
}

// -- Store --------------------------------------------------------------------

const useUIStore = create<UIState & UIActions>((set) => ({
  settingsOpen: false,
  settingsHighlight: null,
  ttmlEditState: null,
  projectSwitcherOpen: false,

  openSettings: (highlight = null) => set({ settingsOpen: true, settingsHighlight: highlight }),
  closeSettings: () => set({ settingsOpen: false, settingsHighlight: null }),
  clearHighlight: () => set({ settingsHighlight: null }),
  setTtmlEditState: (editState) =>
    set((state) => ({
      ttmlEditState: typeof editState === "function" ? editState(state.ttmlEditState) : editState,
    })),
  setProjectSwitcherOpen: (projectSwitcherOpen) => set({ projectSwitcherOpen }),
}));

// -- Exports ------------------------------------------------------------------

export { useUIStore };
export type { TtmlEditState };
