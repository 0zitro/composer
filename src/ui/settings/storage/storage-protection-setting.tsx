import { useStorageProtection } from "@/hooks/useStorageProtection";
import { StorageProtectionNotice } from "@/ui/settings/storage/storage-protection-notice";
import { BROWSER_KIND } from "@/utils/platform";

// -- Component ----------------------------------------------------------------

const StorageProtectionSetting: React.FC = () => {
  const { status, protect } = useStorageProtection();

  return (
    <div className="py-3">
      <StorageProtectionNotice status={status} browser={BROWSER_KIND} onProtect={() => void protect()} />
    </div>
  );
};

// -- Exports ------------------------------------------------------------------

export { StorageProtectionSetting };
