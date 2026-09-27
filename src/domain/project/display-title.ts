// -- Derivation -----------------------------------------------------------------

function displayTitle(title: string): string {
  return title || "Untitled";
}

function quotedTitle(title: string): string {
  return `“${displayTitle(title)}”`;
}

// -- Exports ------------------------------------------------------------------

export { displayTitle, quotedTitle };
