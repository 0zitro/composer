import { displayTitle } from "@/domain/project/display-title";
import { useProjectStore } from "@/stores/project";
import { useUIStore } from "@/stores/ui";
import { Button } from "@/ui/button";
import { Popover } from "@/ui/popover";
import { ProjectArt } from "@/ui/projects/project-art";
import { ProjectSwitcher } from "@/ui/projects/project-switcher";
import { SaveStatusLabel } from "@/ui/projects/save-status-label";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";

// -- Component ----------------------------------------------------------------

const ProjectBreadcrumb: React.FC = () => {
  const title = useProjectStore((state) => state.metadata.title);
  const thumbnail = useProjectStore((state) => state.metadata.thumbnailDataUrl);
  const isOpen = useUIStore((state) => state.projectSwitcherOpen);
  const setOpen = useUIStore((state) => state.setProjectSwitcherOpen);
  const shownTitle = displayTitle(title);

  return (
    <nav aria-label="Project" className="flex items-center gap-0.5 min-w-0 select-none">
      <Button variant="ghost" onClick={() => setOpen(true)} className="h-8 px-2 text-[15px] font-medium">
        Projects
      </Button>
      <IconChevronRight aria-hidden="true" className="size-4 shrink-0 text-composer-text-faint" />
      <Popover
        open={isOpen}
        onOpenChange={setOpen}
        placement="bottom-start"
        aria-label="Switch project"
        trigger={
          <Button
            variant="ghost"
            aria-label={`${shownTitle}, switch project`}
            title="Switch project"
            className="group gap-2 h-auto max-w-[380px] min-w-0 p-1.5 rounded-[10px] text-[15px] font-bold text-composer-text hover:text-composer-text aria-expanded:bg-composer-button"
          >
            <ProjectArt src={thumbnail} size="sm" />
            <span className="truncate">{shownTitle}</span>
            <IconChevronDown
              aria-hidden="true"
              className="size-4 shrink-0 text-composer-text-muted transition-[rotate] duration-150 group-aria-expanded:rotate-180"
            />
          </Button>
        }
      >
        {(close) => <ProjectSwitcher onClose={close} />}
      </Popover>
      <SaveStatusLabel />
    </nav>
  );
};

// -- Exports ------------------------------------------------------------------

export { ProjectBreadcrumb };
