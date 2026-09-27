import { Button } from "@/ui/button";
import { ProjectBreadcrumb } from "@/ui/projects/project-breadcrumb";
import { type AppScreen, LIBRARY_PATH } from "@/utils/app-routes";
import { IconHelp, IconRoute, IconSettings } from "@tabler/icons-react";
import { Link } from "react-router-dom";

// -- Types --------------------------------------------------------------------

interface AppHeaderActions {
  onSettingsOpen: () => void;
  onHelpOpen: () => void;
  onTourStart: () => void;
}

interface AppHeaderProps extends AppHeaderActions {
  screen: AppScreen;
}

// -- Sub-components -------------------------------------------------------------

const EditorBrand: React.FC = () => (
  <div className="flex items-center gap-2 min-w-0">
    <h1 className="shrink-0">
      <img src="/logo.svg" alt="Composer Logo" className="block size-6" />
      <span className="sr-only">Composer</span>
    </h1>
    <ProjectBreadcrumb />
  </div>
);

const LibraryBrand: React.FC = () => (
  <Link
    to={LIBRARY_PATH}
    aria-label="Composer, Projects"
    className="inline-flex items-center gap-2 text-xl font-bold text-composer-text cursor-pointer"
  >
    <img src="/logo.svg" alt="" className="block size-6" />
    Composer
  </Link>
);

// -- Component ----------------------------------------------------------------

const AppHeader: React.FC<AppHeaderProps> = ({ screen, onSettingsOpen, onHelpOpen, onTourStart }) => (
  <header className="flex items-center justify-between gap-4 p-4 border-b select-none border-composer-border">
    {screen === "editor" ? <EditorBrand /> : <LibraryBrand />}
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
export type { AppHeaderActions, AppHeaderProps };
