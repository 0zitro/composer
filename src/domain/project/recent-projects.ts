import type { ProjectIndexEntry } from "@/domain/project/index-entry";

// -- Types --------------------------------------------------------------------

interface RecentProjectsOptions {
  excludeId: string | undefined;
  query: string;
  limit: number;
}

// -- Helpers ------------------------------------------------------------------

function matchesQuery(entry: ProjectIndexEntry, needle: string): boolean {
  return [entry.title, entry.album, ...entry.artists].some((field) => field.toLowerCase().includes(needle));
}

// -- Derivations --------------------------------------------------------------

function recentProjects(entries: readonly ProjectIndexEntry[], options: RecentProjectsOptions): ProjectIndexEntry[] {
  const needle = options.query.trim().toLowerCase();
  return entries
    .filter((entry) => entry.id !== options.excludeId && (needle === "" || matchesQuery(entry, needle)))
    .toSorted((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, options.limit);
}

// -- Exports ------------------------------------------------------------------

export { recentProjects };
export type { RecentProjectsOptions };
