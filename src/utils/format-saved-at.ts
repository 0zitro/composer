// -- Formatting ---------------------------------------------------------------

function formatSavedAt(savedAt: number | undefined): string {
  if (!savedAt) return "unknown";
  try {
    return new Date(savedAt).toLocaleString();
  } catch {
    return new Date(savedAt).toISOString();
  }
}

// -- Exports ------------------------------------------------------------------

export { formatSavedAt };
