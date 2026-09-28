// -- Formatting ---------------------------------------------------------------

function formatLineCount(count: number): string {
  return count === 1 ? "1 line" : `${count} lines`;
}

// -- Exports ------------------------------------------------------------------

export { formatLineCount };
