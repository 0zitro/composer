import { projectStage, syncedPercent } from "@/domain/project/progress";
import { IconCircleCheck } from "@tabler/icons-react";

// -- Types --------------------------------------------------------------------

interface ProjectProgressProps {
  lineCount: number;
  syncedLineCount: number;
}

// -- Component ----------------------------------------------------------------

const ProjectProgress: React.FC<ProjectProgressProps> = ({ lineCount, syncedLineCount }) => {
  const counts = { lineCount, syncedLineCount };
  if (lineCount === 0) return <span className="text-[13px] text-composer-text-muted">No lyrics</span>;
  if (projectStage(counts) === "synced") {
    return (
      <IconCircleCheck role="img" aria-label="Synced" className="justify-self-end size-[18px] text-composer-positive" />
    );
  }
  const percent = syncedPercent(counts);
  return (
    <div
      role="progressbar"
      aria-label={`${syncedLineCount} of ${lineCount} lines synced`}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="relative h-1 overflow-hidden rounded-full bg-composer-button"
    >
      <span className="absolute inset-y-0 left-0 rounded-full bg-composer-accent" style={{ width: `${percent}%` }} />
    </div>
  );
};

// -- Exports ------------------------------------------------------------------

export { ProjectProgress };
