import { Button } from "@/ui/button";
import { IconDownload, IconTrash, IconX } from "@tabler/icons-react";

// -- Types --------------------------------------------------------------------

interface BulkBarProps {
  selectedCount: number;
  visibleCount: number;
  onSelectAll: () => void;
  onExport: () => void;
  onDelete: () => void;
  onClear: () => void;
}

// -- Constants ----------------------------------------------------------------

const BAR_STYLES =
  "flex items-center gap-1 p-1.5 rounded-[14px] bg-composer-bg-elevated pointer-events-auto select-none animate-[library-toast-in_200ms_cubic-bezier(0.2,0,0,1)] shadow-[0_0_0_1px_var(--color-composer-border),0_12px_32px_-8px_rgb(0_0_0/0.5),0_2px_6px_rgb(0_0_0/0.25)]";
const QUIET_BUTTON = "text-composer-text/60";

// -- Sub-components -------------------------------------------------------------

const Divider: React.FC = () => <span aria-hidden="true" className="w-px h-5 mx-1 bg-composer-border" />;

// -- Component ----------------------------------------------------------------

const BulkBar: React.FC<BulkBarProps> = ({ selectedCount, visibleCount, onSelectAll, onExport, onDelete, onClear }) => (
  <div className="fixed inset-x-0 bottom-6 z-60 flex justify-center pointer-events-none">
    <div role="toolbar" aria-label="Selected projects" className={BAR_STYLES}>
      <span className="pl-2 pr-2.5 font-medium tabular-nums">{selectedCount} selected</span>
      {selectedCount < visibleCount && (
        <>
          <Button variant="ghost" size="sm" onClick={onSelectAll} className={QUIET_BUTTON}>
            Select all {visibleCount}
          </Button>
          <Divider />
        </>
      )}
      <Button variant="ghost" size="sm" hasIcon onClick={onExport} className={QUIET_BUTTON}>
        <IconDownload aria-hidden="true" className="size-3.5" />
        Export
      </Button>
      <Button variant="danger" size="sm" hasIcon onClick={onDelete} className="text-[#f89698]">
        <IconTrash aria-hidden="true" className="size-3.5" />
        Delete
      </Button>
      <Divider />
      <Button variant="ghost" size="icon" aria-label="Clear selection" onClick={onClear} className="size-7">
        <IconX aria-hidden="true" className="size-4" />
      </Button>
    </div>
  </div>
);

// -- Exports ------------------------------------------------------------------

export { BulkBar };
