import { cn } from "@/utils/cn";
import { IconMusic } from "@tabler/icons-react";

// -- Types --------------------------------------------------------------------

type ProjectArtSize = "sm" | "md" | "row" | "dialog" | "hero" | "card";

interface ProjectArtProps {
  src?: string;
  size: ProjectArtSize;
  className?: string;
}

// -- Constants ----------------------------------------------------------------

const FRAME_SIZES: Record<ProjectArtSize, string> = {
  sm: "size-[22px] rounded-[5px]",
  md: "size-9 rounded-md",
  row: "size-10 rounded-md",
  dialog: "size-12 rounded-md",
  hero: "size-30 rounded-[10px] shadow-[0_12px_32px_-8px_rgb(0_0_0/0.5)]",
  card: "w-full aspect-square rounded-[10px]",
};

const ICON_SIZES: Record<ProjectArtSize, string> = {
  sm: "size-2.5",
  md: "size-4",
  row: "size-[18px]",
  dialog: "size-[22px]",
  hero: "size-[54px]",
  card: "size-[45%]",
};

// -- Component ----------------------------------------------------------------

const ProjectArt: React.FC<ProjectArtProps> = ({ src, size, className }) => (
  <span
    className={cn(
      "relative grid place-items-center shrink-0 overflow-hidden bg-composer-bg-elevated",
      "after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] after:pointer-events-none",
      FRAME_SIZES[size],
      className,
    )}
  >
    {src ? (
      <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
    ) : (
      <IconMusic aria-hidden="true" className={cn("text-composer-text opacity-50", ICON_SIZES[size])} />
    )}
  </span>
);

// -- Exports ------------------------------------------------------------------

export { ProjectArt };
