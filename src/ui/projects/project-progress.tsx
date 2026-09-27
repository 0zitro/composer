import { projectStage, syncedPercent } from "@/domain/project/progress";
import { ProgressBar } from "@/ui/projects/progress-bar";
import { cn } from "@/utils/cn";
import { IconCircleCheck } from "@tabler/icons-react";

// -- Types --------------------------------------------------------------------

interface ProjectProgressProps {
  lineCount: number;
  syncedLineCount: number;
  isActive?: boolean;
}

// -- Component ----------------------------------------------------------------

const ProjectProgress: React.FC<ProjectProgressProps> = ({ lineCount, syncedLineCount, isActive = false }) => {
  const counts = { lineCount, syncedLineCount };
  if (lineCount === 0) {
    return (
      <span className={cn("text-[13px]", isActive ? "text-composer-text-secondary" : "text-composer-text-muted")}>
        No lyrics
      </span>
    );
  }
  if (projectStage(counts) === "synced") {
    return (
      <IconCircleCheck role="img" aria-label="Synced" className="justify-self-end size-[18px] text-composer-positive" />
    );
  }
  return <ProgressBar percent={syncedPercent(counts)} label={`${syncedLineCount} of ${lineCount} lines synced`} />;
};

// -- Exports ------------------------------------------------------------------

export { ProjectProgress };
