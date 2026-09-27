import { cn } from "@/utils/cn";
import { IconMusic } from "@tabler/icons-react";

// -- Types --------------------------------------------------------------------

type ProjectArtSize = "sm" | "md";

interface ProjectArtProps {
  src?: string;
  size: ProjectArtSize;
}

// -- Constants ----------------------------------------------------------------

const FRAME_SIZES: Record<ProjectArtSize, string> = {
  sm: "size-[22px] rounded-[5px]",
  md: "size-9 rounded-md",
};

const ICON_SIZES: Record<ProjectArtSize, string> = {
  sm: "size-2.5",
  md: "size-4",
};

// -- Component ----------------------------------------------------------------

const ProjectArt: React.FC<ProjectArtProps> = ({ src, size }) => (
  <span
    className={cn(
      "relative grid place-items-center shrink-0 overflow-hidden bg-composer-bg-elevated text-composer-text-muted",
      "after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)] after:pointer-events-none",
      FRAME_SIZES[size],
    )}
  >
    {src ? (
      <img src={src} alt="" className="size-full object-cover" />
    ) : (
      <IconMusic aria-hidden="true" className={ICON_SIZES[size]} />
    )}
  </span>
);

// -- Exports ------------------------------------------------------------------

export { ProjectArt };
