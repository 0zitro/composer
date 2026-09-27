import { cn } from "@/utils/cn";

// -- Types --------------------------------------------------------------------

type ProgressBarTone = "default" | "on-media";

interface ProgressBarProps {
  percent: number;
  label: string;
  tone?: ProgressBarTone;
  className?: string;
}

// -- Constants ----------------------------------------------------------------

const TRACK_STYLES: Record<ProgressBarTone, string> = {
  default: "h-1 bg-composer-button",
  "on-media": "h-1.5 bg-white/16",
};

const FILL_STYLES: Record<ProgressBarTone, string> = {
  default: "bg-composer-accent",
  "on-media": "bg-white",
};

// -- Component ----------------------------------------------------------------

const ProgressBar: React.FC<ProgressBarProps> = ({ percent, label, tone = "default", className }) => (
  <div
    role="progressbar"
    aria-label={label}
    aria-valuenow={percent}
    aria-valuemin={0}
    aria-valuemax={100}
    className={cn("relative overflow-hidden rounded-full", TRACK_STYLES[tone], className)}
  >
    <span
      className={cn("absolute inset-y-0 left-0 rounded-full", FILL_STYLES[tone])}
      style={{ width: `${percent}%` }}
    />
  </div>
);

// -- Exports ------------------------------------------------------------------

export { ProgressBar };
export type { ProgressBarTone };
