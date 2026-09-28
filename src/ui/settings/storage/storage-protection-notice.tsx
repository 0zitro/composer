import type { StorageProtection } from "@/lib/browser-storage";
import { Button } from "@/ui/button";
import { cn } from "@/utils/cn";
import { IconShieldCheck, IconShieldExclamation } from "@tabler/icons-react";

// -- Types --------------------------------------------------------------------

interface StorageProtectionNoticeProps {
  status: StorageProtection | undefined;
  onProtect: () => void;
}

// -- Constants ----------------------------------------------------------------

const NOTICE_STYLES = "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] text-composer-text select-none";

// -- Component ----------------------------------------------------------------

const StorageProtectionNotice: React.FC<StorageProtectionNoticeProps> = ({ status, onProtect }) => {
  if (status === undefined) return null;

  if (status === "protected") {
    return (
      <div className={cn(NOTICE_STYLES, "bg-composer-input shadow-[inset_0_0_0_1px_var(--color-composer-border)]")}>
        <IconShieldCheck aria-hidden="true" className="size-[18px] shrink-0 text-composer-positive" />
        <div className="flex-1 min-w-0">
          Protected from browser cleanup
          <span className="block text-xs text-composer-text-muted">
            The browser won't clear your projects when disk space runs low.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        NOTICE_STYLES,
        "bg-composer-warning/8 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-composer-warning)_30%,transparent)]",
      )}
    >
      <IconShieldExclamation aria-hidden="true" className="size-[18px] shrink-0 text-composer-warning" />
      <div className="flex-1 min-w-0">
        Not protected
        <span className="block text-xs text-composer-text-muted">
          The browser can clear your projects, lyrics included, when disk space runs low.
        </span>
      </div>
      {status === "unprotected" && (
        <Button variant="secondary" size="sm" onClick={onProtect}>
          Protect storage
        </Button>
      )}
    </div>
  );
};

// -- Exports ------------------------------------------------------------------

export { StorageProtectionNotice };
