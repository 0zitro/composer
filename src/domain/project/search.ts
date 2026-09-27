import type { ProjectIndexEntry } from "@/domain/project/index-entry";

// -- Helpers ------------------------------------------------------------------

function searchable(field: string): string {
  return field.normalize("NFC").toLowerCase();
}

// -- Search -------------------------------------------------------------------

function normalizeProjectQuery(query: string): string {
  return searchable(query.trim());
}

function projectMatchesQuery(entry: ProjectIndexEntry, needle: string): boolean {
  if (needle === "") return true;
  return [entry.title, entry.album, ...entry.artists].some((field) => searchable(field).includes(needle));
}

// -- Exports ------------------------------------------------------------------

export { normalizeProjectQuery, projectMatchesQuery };
