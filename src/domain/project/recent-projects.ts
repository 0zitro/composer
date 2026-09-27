import type { ProjectIndexEntry } from "@/domain/project/index-entry";

// -- Types --------------------------------------------------------------------

interface RecentProjectsOptions {
  excludeId: string | undefined;
  query: string;
  limit: number;
}

// -- Helpers ------------------------------------------------------------------

function searchable(field: string): string {
  return field.normalize("NFC").toLowerCase();
}

function matchesQuery(entry: ProjectIndexEntry, needle: string): boolean {
  return [entry.title, entry.album, ...entry.artists].some((field) => searchable(field).includes(needle));
}

// -- Derivations --------------------------------------------------------------

function recentProjects(entries: readonly ProjectIndexEntry[], options: RecentProjectsOptions): ProjectIndexEntry[] {
  const needle = searchable(options.query.trim());
  return entries
    .filter((entry) => entry.id !== options.excludeId && (needle === "" || matchesQuery(entry, needle)))
    .toSorted((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id))
    .slice(0, options.limit);
}

// -- Exports ------------------------------------------------------------------

export { recentProjects };
export type { RecentProjectsOptions };
