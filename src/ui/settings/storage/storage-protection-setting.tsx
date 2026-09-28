import { useStorageProtection } from "@/hooks/useStorageProtection";
import { StorageProtectionNotice } from "@/ui/settings/storage/storage-protection-notice";

// -- Component ----------------------------------------------------------------

const StorageProtectionSetting: React.FC = () => {
  const { status, protect } = useStorageProtection();

  return (
    <div className="py-3">
      <StorageProtectionNotice status={status} onProtect={() => void protect()} />
    </div>
  );
};

// -- Exports ------------------------------------------------------------------

export { StorageProtectionSetting };
