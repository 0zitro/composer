// -- Types --------------------------------------------------------------------

type SaveKind = "project" | "audio" | "stem";
type SaveStatus = "saved" | "saving" | "failed";

// -- Module state -------------------------------------------------------------

let savePending = false;
let writesInFlight = 0;
const failedKinds = new Set<SaveKind>();
let status: SaveStatus = "saved";
const listeners = new Set<() => void>();

// -- Publishing ---------------------------------------------------------------

function publishStatus(): void {
  const next: SaveStatus = savePending || writesInFlight > 0 ? "saving" : failedKinds.size > 0 ? "failed" : "saved";
  if (next === status) return;
  status = next;
  for (const listener of listeners) listener();
}

// -- Public API ---------------------------------------------------------------

function getSaveStatus(): SaveStatus {
  return status;
}

function subscribeSaveStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setSavePending(pending: boolean): void {
  if (savePending === pending) return;
  savePending = pending;
  publishStatus();
}

function trackSave(kind: SaveKind, write: Promise<void>): Promise<void> {
  writesInFlight++;
  publishStatus();
  return write
    .then(
      () => {
        failedKinds.delete(kind);
      },
      (error: unknown) => {
        failedKinds.add(kind);
        throw error;
      },
    )
    .finally(() => {
      writesInFlight--;
      publishStatus();
    });
}

function resetSaveStatus(): void {
  savePending = false;
  writesInFlight = 0;
  failedKinds.clear();
  status = "saved";
}

// -- Exports ------------------------------------------------------------------

export { getSaveStatus, subscribeSaveStatus, setSavePending, trackSave, resetSaveStatus };
export type { SaveStatus, SaveKind };
