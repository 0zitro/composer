import { bindSaveTarget } from "@/lib/open-project-session";
import { type ProjectSaveArgs, saveProjectTo } from "@/lib/persistence";
import { useSettingsStore } from "@/stores/settings";

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[Persistence]";

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

function writePendingSave(failureMessage: string): Promise<void> {
  const pending = pendingSave;
  pendingSave = null;
  if (!pending) return Promise.resolve();
  return saveProjectTo(pending.target, ...pending.args).catch((err: unknown) =>
    console.error(LOG_PREFIX, failureMessage, err),
  );
}

// -- Public API ---------------------------------------------------------------

function debouncedSave(...args: ProjectSaveArgs): void {
  pendingSave = { target: bindSaveTarget(), args };
  clearSaveTimer();
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    void writePendingSave("Auto-save failed:");
  }, useSettingsStore.getState().autoSaveDelay);
}

function cancelPendingSave(): void {
  clearSaveTimer();
  pendingSave = null;
}

function flushPendingSave(): Promise<void> {
  clearSaveTimer();
  return writePendingSave("Flush save failed:");
}

// -- Exports ------------------------------------------------------------------

export { debouncedSave, cancelPendingSave, flushPendingSave };
