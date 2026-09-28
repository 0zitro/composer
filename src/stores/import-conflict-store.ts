import type { ImportConflict } from "@/lib/project-import";
import { toast } from "sonner";
import { create } from "zustand";

// -- Types --------------------------------------------------------------------

type ImportConflictChoice = "replace" | "keep-both" | "cancel";

interface ImportConflictState {
  conflict: ImportConflict | null;
  askedAt: number;
  resolve: ((choice: ImportConflictChoice) => void) | null;
  ask: (conflict: ImportConflict) => Promise<ImportConflictChoice>;
  answer: (choice: ImportConflictChoice) => void;
}

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[ImportConflict]";

// -- Store --------------------------------------------------------------------

const useImportConflictStore = create<ImportConflictState>((set, get) => ({
  conflict: null,
  askedAt: 0,
  resolve: null,

  ask: (conflict) => {
    if (get().conflict) {
      console.warn(LOG_PREFIX, "a conflict prompt is already open; cancelling the second import");
      toast.warning("Finish the current import first");
      return Promise.resolve("cancel");
    }
    return new Promise<ImportConflictChoice>((resolve) => {
      set({ conflict, askedAt: Date.now(), resolve });
    });
  },

  answer: (choice) => {
    get().resolve?.(choice);
    set({ conflict: null, resolve: null });
  },
}));

// -- Exports ------------------------------------------------------------------

export { useImportConflictStore };
