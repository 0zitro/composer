import type { StorageProtection } from "@/lib/browser-storage";
import { Button } from "@/ui/button";
import { cn } from "@/utils/cn";
import type { BrowserKind } from "@/utils/platform";
import { IconShieldCheck, IconShieldExclamation } from "@tabler/icons-react";

// -- Types --------------------------------------------------------------------

interface StorageProtectionNoticeProps {
  status: StorageProtection | undefined;
  browser: BrowserKind;
  onProtect: () => void;
}

// -- Constants ----------------------------------------------------------------

const NOTICE_STYLES = "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] text-composer-text select-none";
const UNPROTECTED_DESCRIPTION = "The browser can clear your projects, lyrics included, when disk space runs low.";
const CHROMIUM_STEPS_INTRO = "Your browser decides this on its own. Either of these usually works:";
const CHROMIUM_STEPS = [
  "Install Composer as an app: open the browser menu and choose Install page as app.",
  "Bookmark Composer and keep using it.",
];
const CHROMIUM_STEPS_OUTRO = "Then click Protect storage again. This doesn't work in Incognito.";

// -- Component ----------------------------------------------------------------

const StorageProtectionNotice: React.FC<StorageProtectionNoticeProps> = ({ status, browser, onProtect }) => {
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

  const showsChromiumSteps = status === "unprotected" && browser === "chromium";

  return (
    <div
      className={cn(
        NOTICE_STYLES,
        showsChromiumSteps && "items-start gap-3.5 p-4",
        "bg-composer-warning/8 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-composer-warning)_30%,transparent)]",
      )}
    >
      <IconShieldExclamation
        aria-hidden="true"
        className={cn("size-[18px] shrink-0 text-composer-warning", showsChromiumSteps && "mt-px")}
      />
      <div className="flex-1 min-w-0">
        Not protected
        {showsChromiumSteps ? (
          <div className="mt-1 text-xs leading-[1.55] text-composer-text-muted text-pretty">
            <p>{CHROMIUM_STEPS_INTRO}</p>
            <ol className="my-2.5 pl-4 space-y-1.5 list-decimal marker:text-composer-text-muted/70 marker:tabular-nums">
              {CHROMIUM_STEPS.map((step) => (
                <li key={step} className="pl-1">
                  {step}
                </li>
              ))}
            </ol>
            <p>{CHROMIUM_STEPS_OUTRO}</p>
          </div>
        ) : (
          <span className="block text-xs text-composer-text-muted">{UNPROTECTED_DESCRIPTION}</span>
        )}
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
