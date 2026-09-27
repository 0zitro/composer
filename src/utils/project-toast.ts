import { openProject } from "@/lib/open-project";
import { toast } from "sonner";

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[Projects]";
const NEW_PROJECT_TOAST_DURATION_MS = 10_000;

// -- Copy -----------------------------------------------------------------

function quotedTitle(title: string): string {
  return `“${title || "Untitled"}”`;
}

// -- Toasts -------------------------------------------------------------------

function showNewProjectToast(heading: string, description: string, previousId: string): void {
  toast(heading, {
    description,
    duration: NEW_PROJECT_TOAST_DURATION_MS,
    action: {
      label: "Switch back",
      onClick: () => {
        openProject(previousId).catch((error: unknown) => {
          console.error(LOG_PREFIX, "could not switch back", error);
          toast.error("Couldn't switch back to that project");
        });
      },
    },
  });
}

// -- Exports ------------------------------------------------------------------

export { quotedTitle, showNewProjectToast };
