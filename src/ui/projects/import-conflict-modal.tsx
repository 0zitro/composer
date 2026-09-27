import { displayArtists, displayTitle } from "@/domain/project/display-title";
import { projectFileSummary } from "@/lib/project-import";
import { useImportConflictStore } from "@/stores/import-conflict-store";
import { Button } from "@/ui/button";
import { Modal } from "@/ui/modal";
import { ProjectArt } from "@/ui/projects/project-art";
import { formatRelativeTimeInline, formatShortDate } from "@/utils/format-relative-time";
import { useRef } from "react";

// -- Constants ----------------------------------------------------------------

const DESCRIBED_BY_ID = "import-conflict-body";

// -- Helpers ------------------------------------------------------------------

function syncedCounts({ lineCount, syncedLineCount }: { lineCount: number; syncedLineCount: number }): string {
  return lineCount === 0 ? "no lyrics" : `${syncedLineCount} of ${lineCount} lines synced`;
}

// -- Component ----------------------------------------------------------------

const ImportConflictModalHost: React.FC = () => {
  const conflict = useImportConflictStore((state) => state.conflict);
  const askedAt = useImportConflictStore((state) => state.askedAt);
  const answer = useImportConflictStore((state) => state.answer);
  const cancelRef = useRef<HTMLButtonElement>(null);
  if (!conflict) return null;

  const { existing, file } = conflict;
  const summary = projectFileSummary(file);

  return (
    <Modal
      isOpen
      onClose={() => answer("cancel")}
      title="Project already in your library"
      className="max-w-md"
      role="alertdialog"
      describedById={DESCRIBED_BY_ID}
      initialFocusRef={cancelRef}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <ProjectArt src={existing.thumbnailDataUrl} size="dialog" />
          <div className="min-w-0">
            <div className="truncate font-medium select-text">{displayTitle(existing.title)}</div>
            <div className="truncate text-[13px] text-composer-text-muted select-text">
              {displayArtists(existing.artists)}
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 m-0 text-[13px] tabular-nums">
          <dt className="text-composer-text-muted select-none">In the file</dt>
          <dd className="m-0 select-text">
            Saved {formatShortDate(summary.savedAt, askedAt)}, {syncedCounts(summary)}
          </dd>
          <dt className="text-composer-text-muted select-none">In your library</dt>
          <dd className="m-0 select-text">
            Edited {formatRelativeTimeInline(existing.updatedAt, askedAt)}, {syncedCounts(existing)}
          </dd>
        </dl>
        <div className="flex justify-end gap-2 pt-1 select-none">
          <Button ref={cancelRef} variant="ghost" onClick={() => answer("cancel")}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => answer("keep-both")}>
            Keep both
          </Button>
          <Button variant="destructive" onClick={() => answer("replace")}>
            Replace project
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// -- Exports ------------------------------------------------------------------

export { ImportConflictModalHost };
