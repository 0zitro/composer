import { bindSaveTarget } from "@/lib/open-project-session";
import { type ProjectSaveArgs, saveProjectTo } from "@/lib/persistence";
import { awaitInFlightSaves, setSavePending, trackSave } from "@/lib/save-status";
import { useProjectStore } from "@/stores/project";
import { useSettingsStore } from "@/stores/settings";

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[SaveQueue]";

// -- Types --------------------------------------------------------------------

interface PendingSave {
  target: Promise<string>;
  args: ProjectSaveArgs;
}

// -- Module state -------------------------------------------------------------

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingSave: PendingSave | null = null;

// -- Helpers ------------------------------------------------------------------

function clearSaveTimer(): void {
  if (!saveTimeout) return;
  clearTimeout(saveTimeout);
  saveTimeout = null;
}

function takePendingSave(): Promise<void> {
  const pending = pendingSave;
  pendingSave = null;
  if (!pending) {
    setSavePending(false);
    return Promise.resolve();
  }
  const written = trackSave(
    "project",
    saveProjectTo(pending.target, pending.args, useProjectStore.getState().activeTab),
  );
  setSavePending(false);
  return written;
}

// -- Public API ---------------------------------------------------------------

function debouncedSave(...args: ProjectSaveArgs): void {
  pendingSave = { target: bindSaveTarget(), args };
  setSavePending(true);
  clearSaveTimer();
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    takePendingSave().catch((err: unknown) => console.error(LOG_PREFIX, "Auto-save failed:", err));
  }, useSettingsStore.getState().autoSaveDelay);
}

function cancelPendingSave(): void {
  clearSaveTimer();
  pendingSave = null;
  setSavePending(false);
}

function flushPendingSave(): Promise<void> {
  clearSaveTimer();
  return takePendingSave().then(() => awaitInFlightSaves());
}

function flushPendingSaveQuietly(): void {
  flushPendingSave().catch((err: unknown) => console.error(LOG_PREFIX, "Flush save failed:", err));
}

// -- Exports ------------------------------------------------------------------

export { debouncedSave, cancelPendingSave, flushPendingSave, flushPendingSaveQuietly };
