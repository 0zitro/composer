// -- Derivation ---------------------------------------------------------------

function displayTitle(title: string): string {
  return title || "Untitled";
}

function quotedTitle(title: string): string {
  return `“${displayTitle(title)}”`;
}

function displayArtists(artists: readonly string[]): string {
  return artists.join(", ") || "No artist";
}

function youtubeSourceTitle(title: string, videoId: string): string {
  return title && title !== videoId ? title : videoId;
}

// -- Exports ------------------------------------------------------------------

export { displayTitle, quotedTitle, displayArtists, youtubeSourceTitle };
