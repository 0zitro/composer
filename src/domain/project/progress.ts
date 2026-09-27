import type { ProjectIndexEntry } from "@/domain/project/index-entry";

// -- Types --------------------------------------------------------------------

type ProjectStage = "not-synced" | "syncing" | "synced";
type ProgressCounts = Pick<ProjectIndexEntry, "lineCount" | "syncedLineCount">;

// -- Derivations --------------------------------------------------------------

function projectStage({ lineCount, syncedLineCount }: ProgressCounts): ProjectStage {
  if (lineCount === 0 || syncedLineCount <= 0) return "not-synced";
  return syncedLineCount >= lineCount ? "synced" : "syncing";
}

function syncedPercent({ lineCount, syncedLineCount }: ProgressCounts): number {
  if (lineCount === 0) return 0;
  const synced = Math.min(Math.max(syncedLineCount, 0), lineCount);
  return Math.round((synced / lineCount) * 100);
}

function progressDescription({
  lineCount,
  syncedLineCount,
  hasWordTiming,
}: ProgressCounts & Pick<ProjectIndexEntry, "hasWordTiming">): string {
  if (lineCount === 0) return "No lyrics yet";
  const synced = `${Math.min(Math.max(syncedLineCount, 0), lineCount)} of ${lineCount} lines synced`;
  if (syncedLineCount <= 0) return synced;
  return `${synced}, ${hasWordTiming ? "word by word" : "line by line"}`;
}

// -- Exports ------------------------------------------------------------------

export { projectStage, syncedPercent, progressDescription };
export type { ProjectStage, ProgressCounts };
