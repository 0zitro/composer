import { storageUsage } from "@/domain/storage/usage";
import { useOpenProjectId } from "@/hooks/useOpenProjectId";
import { useProjectIndex } from "@/hooks/useProjectIndex";
import { useStorageReport } from "@/hooks/useStorageReport";
import { ProjectAudioList } from "@/ui/settings/storage/project-audio-list";

// -- Component ----------------------------------------------------------------

const ProjectAudioListSetting: React.FC = () => {
  const { entries, fetchedAt } = useProjectIndex();
  const openProjectId = useOpenProjectId();
  const report = useStorageReport();

  if (entries === undefined || report === undefined) return null;

  const { stemBytes } = storageUsage(entries, report.stemJobs, report.unindexedAudioBytes);

  return (
    <div className="py-3">
      <ProjectAudioList entries={entries} openProjectId={openProjectId} now={fetchedAt} stemBytes={stemBytes} />
    </div>
  );
};

// -- Exports ------------------------------------------------------------------

export { ProjectAudioListSetting };
