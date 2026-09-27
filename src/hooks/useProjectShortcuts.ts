import { useEffect } from "react";
import { createProject } from "@/lib/open-project";
import { isAnyModalOpen } from "@/stores/modal-stack";
import { useUIStore } from "@/stores/ui";
import { findMatchingShortcut } from "@/utils/shortcut-matcher";

// -- Constants ----------------------------------------------------------------

const SWITCHER_SHORTCUT_ID = "global.openProjectSwitcher";
const NEW_PROJECT_SHORTCUT_ID = "global.newProject";

// -- Hook ---------------------------------------------------------------------

function useProjectShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isAnyModalOpen()) return;
      const matched = findMatchingShortcut(event, "global");
      if (matched === SWITCHER_SHORTCUT_ID) {
        event.preventDefault();
        useUIStore.getState().setProjectSwitcherOpen(true);
        return;
      }
      if (matched === NEW_PROJECT_SHORTCUT_ID) {
        event.preventDefault();
        useUIStore.getState().setProjectSwitcherOpen(false);
        createProject();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

// -- Exports ------------------------------------------------------------------

export { useProjectShortcuts };
