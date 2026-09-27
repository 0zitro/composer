import { Button } from "@/ui/button";
import { ProjectBreadcrumb } from "@/ui/projects/project-breadcrumb";
import { IconHelp, IconRoute, IconSettings } from "@tabler/icons-react";

// -- Types --------------------------------------------------------------------

interface AppHeaderProps {
  onSettingsOpen: () => void;
  onHelpOpen: () => void;
  onTourStart: () => void;
}

// -- Component ----------------------------------------------------------------

const AppHeader: React.FC<AppHeaderProps> = ({ onSettingsOpen, onHelpOpen, onTourStart }) => (
  <header className="flex items-center justify-between gap-4 p-4 border-b select-none border-composer-border">
    <div className="flex items-center gap-1.5 min-w-0">
      <h1 className="shrink-0">
        <img src="/logo.svg" alt="Composer Logo" className="block size-6" />
        <span className="sr-only">Composer</span>
      </h1>
      <ProjectBreadcrumb />
    </div>
    <div className="flex items-center gap-1 shrink-0">
      <Button size="icon" variant="ghost" onClick={onSettingsOpen} title="Settings">
        <IconSettings className="size-5" />
      </Button>
      <Button size="icon" variant="ghost" onClick={onTourStart} title="Product tour">
        <IconRoute className="size-5" />
      </Button>
      <Button size="icon" variant="ghost" onClick={onHelpOpen} title="Keyboard shortcuts (?)">
        <IconHelp className="size-5" />
      </Button>
    </div>
  </header>
);

// -- Exports ------------------------------------------------------------------

export { AppHeader };
