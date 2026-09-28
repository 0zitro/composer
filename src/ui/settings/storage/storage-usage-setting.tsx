import { keepsYouTubeAudio } from "@/domain/storage/audio-retention";
import { freeBytes } from "@/domain/storage/space";
import { storageUsage } from "@/domain/storage/usage";
import { useProjectIndex } from "@/hooks/useProjectIndex";
import { useStorageReport } from "@/hooks/useStorageReport";
import { useSettingsStore } from "@/stores/settings";
import { StorageUsagePanel } from "@/ui/settings/storage/storage-usage-panel";

// -- Component ----------------------------------------------------------------

const StorageUsageSetting: React.FC = () => {
  const { entries } = useProjectIndex();
  const report = useStorageReport();
  const keepYouTubeAudio = useSettingsStore((s) => s.keepYouTubeAudio);
  const bridgeEnabled = useSettingsStore((s) => s.experiments.youtubeBridge);

  const usage = storageUsage(entries ?? [], report?.stemJobs ?? [], report?.unindexedAudioBytes ?? 0);

  return (
    <div className="py-3">
      <StorageUsagePanel
        usage={usage}
        freeBytes={report?.estimate ? freeBytes(report.estimate) : undefined}
        youtubeKept={keepsYouTubeAudio(keepYouTubeAudio, bridgeEnabled)}
      />
    </div>
  );
};

// -- Exports ------------------------------------------------------------------

export { StorageUsageSetting };
