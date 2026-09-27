import { forkOpenProject } from "@/lib/open-project";
import { openProjectIdSnapshot } from "@/lib/open-project-session";
import { cancelPendingSave } from "@/lib/persistence-debounce";
import { subscribeProjectsDeleted } from "@/lib/project-channel";
import { useEffect } from "react";
import { toast } from "sonner";

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[Projects]";

// -- Helpers ------------------------------------------------------------------

function keepAsNewProject(): void {
  forkOpenProject()
    .then(() => toast.success("Saved as a new project"))
    .catch((error: unknown) => {
      console.error(LOG_PREFIX, "could not keep the project", error);
      toast.error("Couldn't save this as a new project");
    });
}

function warnOpenProjectDeleted(): void {
  cancelPendingSave();
  toast.warning("This project was deleted in another tab", {
    description: "Changes here are not being saved.",
    duration: Number.POSITIVE_INFINITY,
    action: { label: "Keep as new project", onClick: keepAsNewProject },
  });
}

// -- Hook ---------------------------------------------------------------------

function useProjectChannel(): void {
  useEffect(
    () =>
      subscribeProjectsDeleted((ids) => {
        const openId = openProjectIdSnapshot();
        if (openId && ids.includes(openId)) warnOpenProjectDeleted();
      }),
    [],
  );
}

// -- Exports ------------------------------------------------------------------

export { useProjectChannel };
