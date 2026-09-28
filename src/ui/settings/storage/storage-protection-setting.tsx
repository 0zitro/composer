import { useStorageProtection } from "@/hooks/useStorageProtection";
import { StorageProtectionNotice } from "@/ui/settings/storage/storage-protection-notice";
import { isChromium } from "@/utils/platform";

// -- Component ----------------------------------------------------------------

const StorageProtectionSetting: React.FC = () => {
  const { status, protect } = useStorageProtection();

  return (
    <div className="py-3">
      <StorageProtectionNotice
        status={status}
        browser={isChromium ? "chromium" : "other"}
        onProtect={() => void protect()}
      />
    </div>
  );
};

// -- Exports ------------------------------------------------------------------

export { StorageProtectionSetting };
