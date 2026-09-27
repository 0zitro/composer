// -- Formatting ---------------------------------------------------------------

function formatProjectCount(count: number): string {
  return count === 1 ? "1 project" : `${count} projects`;
}

// -- Exports ------------------------------------------------------------------

export { formatProjectCount };
