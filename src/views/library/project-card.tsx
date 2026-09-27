import { displayArtists, displayTitle } from "@/domain/project/display-title";
import type { ProjectIndexEntry } from "@/domain/project/index-entry";
import { hasLyrics, progressDescription, projectStage, syncedPercent } from "@/domain/project/progress";
import { Button } from "@/ui/button";
import { menuTriggerProps } from "@/ui/menu";
import { ProgressBar } from "@/ui/progress-bar";
import { ProjectArt } from "@/ui/projects/project-art";
import { SyncedBadge } from "@/ui/projects/synced-badge";
import { SelectCheckbox } from "@/ui/select-checkbox";
import { cn } from "@/utils/cn";
import { AudioStatusLabel } from "@/views/library/audio-status-label";
import type { ProjectItemProps } from "@/views/library/project-row";
import { IconDots } from "@tabler/icons-react";
import { memo } from "react";

// -- Constants ----------------------------------------------------------------

const CARD_STYLES = cn(
  "group/card relative flex flex-col gap-2.5 rounded-[10px] select-none",
  "[content-visibility:auto] [contain-intrinsic-size:auto_260px]",
  "has-[[data-row-open]:focus-visible]:outline-2 has-[[data-row-open]:focus-visible]:outline-offset-4 has-[[data-row-open]:focus-visible]:outline-composer-accent",
);
const REVEAL_ON_CARD = cn(
  "opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100",
  "group-data-[selecting=true]/grid:opacity-100",
);

// -- Sub-components -------------------------------------------------------------

const CardProgressLabel: React.FC<{ project: ProjectIndexEntry }> = ({ project }) => {
  if (!hasLyrics(project)) return <span>No lyrics</span>;
  if (projectStage(project) === "synced") return <SyncedBadge withLabel />;
  return <span className="tabular-nums">{syncedPercent(project)}%</span>;
};

// -- Component ----------------------------------------------------------------

const ProjectCardContent: React.FC<ProjectItemProps> = ({
  project,
  isSelected,
  isMenuOpen,
  onOpen,
  onToggleSelect,
  onOpenMenu,
}) => {
  const title = displayTitle(project.title);
  return (
    <div
      role="listitem"
      data-project-id={project.id}
      data-selected={isSelected || undefined}
      data-menu={isMenuOpen || undefined}
      onContextMenu={(event) => {
        event.preventDefault();
        onOpenMenu(project.id, { kind: "point", x: event.clientX, y: event.clientY, within: event.currentTarget });
      }}
      className={CARD_STYLES}
    >
      <div className="relative transition-[translate] duration-160 ease-[cubic-bezier(0.2,0,0,1)] group-hover/card:-translate-y-0.5">
        <ProjectArt
          src={project.thumbnailDataUrl}
          size="card"
          className="group-data-selected/card:shadow-[0_0_0_2px_var(--color-composer-accent)]"
        />
        <SelectCheckbox
          label={`Select ${title}`}
          checked={isSelected}
          onToggle={(range) => onToggleSelect(project.id, range)}
          className={cn("absolute top-2.5 left-2.5 z-2 checked:opacity-100", REVEAL_ON_CARD)}
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label={`More actions for ${title}`}
          {...menuTriggerProps(isMenuOpen)}
          onClick={(event) => onOpenMenu(project.id, { kind: "element", element: event.currentTarget })}
          className={cn(
            "absolute top-2 right-2 z-2 bg-black/50 text-white hover:bg-black/70 hover:text-white group-data-menu/card:opacity-100",
            REVEAL_ON_CARD,
          )}
        >
          <IconDots aria-hidden="true" className="size-5" />
        </Button>
      </div>
      <div className="min-w-0">
        <button
          type="button"
          data-row-open
          onClick={() => onOpen(project.id)}
          className="mt-0.5 block max-w-full truncate text-left font-medium text-composer-text cursor-pointer outline-none after:absolute after:inset-0"
        >
          {title}
        </button>
        <div className="truncate text-[13px] text-composer-text-muted">{displayArtists(project.artists)}</div>
      </div>
      <ProgressBar percent={syncedPercent(project)} label={progressDescription(project)} />
      <div className="flex items-center justify-between gap-2 text-xs text-composer-text-muted">
        <AudioStatusLabel project={project} compact />
        <CardProgressLabel project={project} />
      </div>
    </div>
  );
};

const ProjectCard = memo(ProjectCardContent);

// -- Exports ------------------------------------------------------------------

export { ProjectCard };
