import { forkOpenProject } from "@/lib/open-project";
import { openProjectIdSnapshot, subscribeOpenProjectId } from "@/lib/open-project-session";
import { cancelPendingSave } from "@/lib/persistence-debounce";
import { subscribeProjectsDeleted } from "@/lib/project-channel";
import { useEffect } from "react";
import { toast } from "sonner";

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[Projects]";

// -- Module state -------------------------------------------------------------

const dismissWatchers = new Set<string>();

// -- Helpers ------------------------------------------------------------------

function deletedProjectToastId(deletedId: string): string {
  return `project-deleted-${deletedId}`;
}

function keepAsNewProject(deletedId: string): void {
  if (openProjectIdSnapshot() !== deletedId) return;
  forkOpenProject()
    .then(() => toast.success("Saved as a new project"))
    .catch((error: unknown) => {
      console.error(LOG_PREFIX, "could not keep the project", error);
      toast.error("Couldn't save this as a new project");
    });
}

function dismissOnceProjectChanges(deletedId: string): void {
  if (dismissWatchers.has(deletedId)) return;
  dismissWatchers.add(deletedId);
  const unsubscribe = subscribeOpenProjectId(() => {
    if (openProjectIdSnapshot() === deletedId) return;
    toast.dismiss(deletedProjectToastId(deletedId));
    dismissWatchers.delete(deletedId);
    unsubscribe();
  });
}

function warnOpenProjectDeleted(deletedId: string): void {
  cancelPendingSave();
  toast.warning("This project was deleted in another tab", {
    id: deletedProjectToastId(deletedId),
    description: "Changes here are not being saved.",
    duration: Number.POSITIVE_INFINITY,
    action: { label: "Keep as new project", onClick: () => keepAsNewProject(deletedId) },
  });
  dismissOnceProjectChanges(deletedId);
}

// -- Hook ---------------------------------------------------------------------

function useProjectChannel(): void {
  useEffect(
    () =>
      subscribeProjectsDeleted((ids) => {
        const openId = openProjectIdSnapshot();
        if (openId && ids.includes(openId)) warnOpenProjectDeleted(openId);
      }),
    [],
  );
}

// -- Exports ------------------------------------------------------------------

export { useProjectChannel };
