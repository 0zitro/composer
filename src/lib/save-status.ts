// -- Types --------------------------------------------------------------------

type SaveStatus = "saved" | "saving" | "failed";

// -- Module state ---------------------------------------------------------------

let savePending = false;
let writesInFlight = 0;
let lastWriteFailed = false;
let status: SaveStatus = "saved";
const listeners = new Set<() => void>();

// -- Publishing -----------------------------------------------------------------

function publishStatus(): void {
  const next: SaveStatus = savePending || writesInFlight > 0 ? "saving" : lastWriteFailed ? "failed" : "saved";
  if (next === status) return;
  status = next;
  for (const listener of listeners) listener();
}

// -- Public API -----------------------------------------------------------------

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

function trackSave(write: Promise<void>): Promise<void> {
  writesInFlight++;
  publishStatus();
  return write
    .then(
      () => {
        lastWriteFailed = false;
      },
      (error: unknown) => {
        lastWriteFailed = true;
        throw error;
      },
    )
    .finally(() => {
      writesInFlight--;
      publishStatus();
    });
}

// -- Exports ------------------------------------------------------------------

export { getSaveStatus, subscribeSaveStatus, setSavePending, trackSave };
export type { SaveStatus };
