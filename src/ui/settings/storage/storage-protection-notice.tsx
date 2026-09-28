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

// -- Sub-components -------------------------------------------------------------

const WARNING_SURFACE =
  "bg-composer-warning/8 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-composer-warning)_30%,transparent)]";

const NoticeHeading: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="flex-1 min-w-0">
    {title}
    <span className="block text-xs text-composer-text-muted text-pretty">{description}</span>
  </div>
);

const ChromiumSteps: React.FC<{ onProtect: () => void }> = ({ onProtect }) => (
  <div className={cn("rounded-[10px] text-[13px] text-composer-text select-none", WARNING_SURFACE)}>
    <div className="flex items-start gap-3 px-3.5 pt-3">
      <IconShieldExclamation aria-hidden="true" className="size-[18px] mt-px shrink-0 text-composer-warning" />
      <NoticeHeading title="Not protected" description={UNPROTECTED_DESCRIPTION} />
    </div>
    <div className="pt-3 pb-3.5 pr-3.5 pl-[44px] text-xs text-composer-text-muted">
      <p className="text-pretty">{CHROMIUM_STEPS_INTRO}</p>
      <ol className="mt-2 space-y-1.5">
        {CHROMIUM_STEPS.map((step, index) => (
          <li key={step} className="flex items-start gap-2.5 text-composer-text text-pretty">
            <span
              aria-hidden="true"
              className="flex items-center justify-center size-[18px] shrink-0 rounded-full bg-composer-warning/15 text-[11px] font-medium leading-none text-composer-warning tabular-nums"
            >
              {index + 1}
            </span>
            <span className="min-w-0 pt-px">{step}</span>
          </li>
        ))}
      </ol>
    </div>
    <div className="flex items-center justify-between gap-3 py-2.5 pr-2.5 pl-[44px] shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-composer-warning)_20%,transparent)]">
      <p className="text-xs text-composer-text-muted text-pretty">{CHROMIUM_STEPS_OUTRO}</p>
      <Button variant="secondary" size="sm" onClick={onProtect} className="shrink-0">
        Protect storage
      </Button>
    </div>
  </div>
);

// -- Component ----------------------------------------------------------------

const StorageProtectionNotice: React.FC<StorageProtectionNoticeProps> = ({ status, browser, onProtect }) => {
  if (status === undefined) return null;

  if (status === "protected") {
    return (
      <div className={cn(NOTICE_STYLES, "bg-composer-input shadow-[inset_0_0_0_1px_var(--color-composer-border)]")}>
        <IconShieldCheck aria-hidden="true" className="size-[18px] shrink-0 text-composer-positive" />
        <NoticeHeading
          title="Protected from browser cleanup"
          description="The browser won't clear your projects when disk space runs low."
        />
      </div>
    );
  }

  if (status === "unprotected" && browser === "chromium") return <ChromiumSteps onProtect={onProtect} />;

  return (
    <div className={cn(NOTICE_STYLES, WARNING_SURFACE)}>
      <IconShieldExclamation aria-hidden="true" className="size-[18px] shrink-0 text-composer-warning" />
      <NoticeHeading title="Not protected" description={UNPROTECTED_DESCRIPTION} />
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
