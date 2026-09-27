// -- Constants ----------------------------------------------------------------

const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * 1024;

// -- Formatting ---------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < KILOBYTE) return `${bytes} B`;
  if (bytes < MEGABYTE) return `${(bytes / KILOBYTE).toFixed(1)} KB`;
  return `${(bytes / MEGABYTE).toFixed(1)} MB`;
}

// -- Exports ------------------------------------------------------------------

export { formatFileSize };
