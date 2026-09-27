// -- Derivation -----------------------------------------------------------------

function displayTitle(title: string): string {
  return title || "Untitled";
}

function quotedTitle(title: string): string {
  return `“${displayTitle(title)}”`;
}

function displayArtists(artists: readonly string[]): string {
  return artists.join(", ") || "No artist";
}

// -- Exports ------------------------------------------------------------------

export { displayTitle, quotedTitle, displayArtists };
