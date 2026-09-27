import type { ProjectIndexEntry } from "@/domain/project/index-entry";

// -- Types --------------------------------------------------------------------

type ProjectStage = "not-synced" | "syncing" | "synced";
type ProgressCounts = Pick<ProjectIndexEntry, "lineCount" | "syncedLineCount">;

// -- Derivations --------------------------------------------------------------

function hasLyrics({ lineCount }: Pick<ProjectIndexEntry, "lineCount">): boolean {
  return lineCount > 0;
}

function projectStage({ lineCount, syncedLineCount }: ProgressCounts): ProjectStage {
  if (!hasLyrics({ lineCount }) || syncedLineCount <= 0) return "not-synced";
  return syncedLineCount >= lineCount ? "synced" : "syncing";
}

function syncedPercent({ lineCount, syncedLineCount }: ProgressCounts): number {
  if (!hasLyrics({ lineCount })) return 0;
  const synced = Math.min(Math.max(syncedLineCount, 0), lineCount);
  return Math.round((synced / lineCount) * 100);
}

function progressDescription({
  lineCount,
  syncedLineCount,
  hasWordTiming,
}: ProgressCounts & Pick<ProjectIndexEntry, "hasWordTiming">): string {
  if (!hasLyrics({ lineCount })) return "No lyrics yet";
  const synced = `${Math.min(Math.max(syncedLineCount, 0), lineCount)} of ${lineCount} lines synced`;
  if (syncedLineCount <= 0) return synced;
  return `${synced}, ${hasWordTiming ? "word by word" : "line by line"}`;
}

// -- Exports ------------------------------------------------------------------

export { hasLyrics, projectStage, syncedPercent, progressDescription };
export type { ProjectStage, ProgressCounts };
