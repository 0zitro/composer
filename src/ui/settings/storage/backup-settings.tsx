import { deleteAllProjects } from "@/lib/open-project";
import { backUpAllProjects } from "@/lib/storage-actions";
import { useConfirm } from "@/stores/confirm-store";
import { Button } from "@/ui/button";
import { SettingText } from "@/ui/settings/setting-text";
import { formatProjectCount } from "@/utils/project-count";
import { IconDownload, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[BackupSettings]";

// -- Actions ------------------------------------------------------------------

function backUp(): void {
  backUpAllProjects().catch((error: unknown) => {
    console.error(LOG_PREFIX, "could not back up the projects", error);
    toast.error("Couldn't back up your projects");
  });
}

// -- Rows ---------------------------------------------------------------------

const BackUpAllProjectsRow: React.FC<{ projectCount: number }> = ({ projectCount }) => (
  <div className="flex items-center justify-between py-3">
    <SettingText id="backUpAllProjects" />
    <Button variant="secondary" size="sm" hasIcon onClick={backUp} disabled={projectCount === 0}>
      <IconDownload aria-hidden="true" className="size-3.5" />
      Export all
    </Button>
  </div>
);

const DeleteAllProjectsRow: React.FC<{ projectCount: number }> = ({ projectCount }) => {
  const confirm = useConfirm();

  const deleteAll = async () => {
    const confirmed = await confirm({
      title: "Delete all projects?",
      description: `This removes ${formatProjectCount(projectCount)} and all stored audio from this device. This can't be undone.`,
      confirmLabel: "Delete all",
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      await deleteAllProjects();
      toast("Deleted all projects");
    } catch (error) {
      console.error(LOG_PREFIX, "could not delete the projects", error);
      toast.error("Couldn't delete your projects");
    }
  };

  return (
    <div className="flex items-center justify-between py-3">
      <SettingText id="deleteAllProjects" />
      <Button variant="danger" size="sm" hasIcon onClick={deleteAll} disabled={projectCount === 0}>
        <IconTrash aria-hidden="true" className="size-3.5" />
        Delete all
      </Button>
    </div>
  );
};

// -- Exports ------------------------------------------------------------------

export { BackUpAllProjectsRow, DeleteAllProjectsRow };
