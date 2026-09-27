// -- Constants ----------------------------------------------------------------

const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * 1024;

// -- Formatting ---------------------------------------------------------------

function formatMegabytes(bytes: number): string {
  return `${(bytes / MEGABYTE).toFixed(1)} MB`;
}

function formatFileSize(bytes: number): string {
  if (bytes < KILOBYTE) return `${bytes} B`;
  const kilobytes = (bytes / KILOBYTE).toFixed(1);
  return Number(kilobytes) < KILOBYTE ? `${kilobytes} KB` : formatMegabytes(bytes);
}

// -- Exports ------------------------------------------------------------------

export { formatFileSize, formatMegabytes };
