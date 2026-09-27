import { quotedTitle } from "@/domain/project/display-title";
import { hasLyricLines } from "@/domain/project/lyrics-presence";
import { deleteProject, openProject } from "@/lib/open-project";
import { openProjectIdSnapshot } from "@/lib/open-project-session";
import { useProjectStore } from "@/stores/project";
import { toast } from "sonner";

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[ProjectToast]";
const NEW_PROJECT_TOAST_DURATION_MS = 10_000;

// -- Switching back -------------------------------------------------------------

function abandonedNewProjectId(newId: string): string | undefined {
  if (openProjectIdSnapshot() !== newId) return undefined;
  return hasLyricLines(useProjectStore.getState().lines) ? undefined : newId;
}

async function switchBackToPreviousProject(previousId: string, newId: string): Promise<void> {
  const abandonedId = abandonedNewProjectId(newId);
  try {
    await openProject(previousId);
  } catch (error) {
    console.error(LOG_PREFIX, "could not switch back", error);
    toast.error("Couldn't switch back to that project");
    return;
  }
  if (!abandonedId) return;
  deleteProject(abandonedId).catch((error: unknown) => {
    console.error(LOG_PREFIX, "could not delete the abandoned project", error);
  });
}

// -- Toasts -------------------------------------------------------------------

function showSwitchBackToast(message: string, description: string, previousId: string, newId: string): void {
  toast(message, {
    description,
    duration: NEW_PROJECT_TOAST_DURATION_MS,
    action: {
      label: "Switch back",
      onClick: () => {
        void switchBackToPreviousProject(previousId, newId);
      },
    },
  });
}

function showNewProjectToast(title: string, previousTitle: string, previousId: string, newId: string): void {
  showSwitchBackToast(
    `Opened ${quotedTitle(title)} in a new project`,
    `${quotedTitle(previousTitle)} is still in Projects.`,
    previousId,
    newId,
  );
}

function showLinkedProjectToast(title: string, previousTitle: string, previousId: string, newId: string): void {
  showSwitchBackToast(
    `Opened ${quotedTitle(title)} from Better Lyrics`,
    `New project. ${quotedTitle(previousTitle)} is still in Projects.`,
    previousId,
    newId,
  );
}

// -- Exports ------------------------------------------------------------------

export { showNewProjectToast, showLinkedProjectToast };
