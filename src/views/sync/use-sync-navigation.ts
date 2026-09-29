import type { LyricLine } from "@/domain/line/model";
import type { SyncGranularity } from "@/domain/line/sync-progress";
import type { SyncCursor } from "@/domain/sync/cursor";
import { type Step, type WordPicker, stepByLine, stepByWord } from "@/domain/sync/navigation";
import { type WordBox, boxCentre, spatialWordIndex } from "@/domain/sync/spatial";
import { type RefObject, useCallback } from "react";

// -- Reading the rendered lines -----------------------------------------------
//
// Both sync views render every line, so a step can read the line it is moving to without bringing it
// on screen first. The reads are of viewport rects and never of layout offsets: the carousel scales
// the lines beside the current one, and an offset-blind read names the word that scaling moved.

/** One line's rendered element. The id is compared rather than spelled into a selector. */
function lineElement(container: HTMLElement, lineId: string): HTMLElement | null {
  const lines = Array.from(container.querySelectorAll<HTMLElement>("[data-sync-line]"));

  return lines.find((line) => line.dataset.syncLine === lineId) ?? null;
}

/**
 * The boxes of a line's main words, in the order the line reads.
 *
 * The marked elements are the words' own text: a background word carries a marker of its own, and the
 * wrappers that hold the timing inputs carry none, so neither widens a box. A word's own rect already
 * has the shape the pick reads, so it is handed over as it stands.
 */
function readWordBoxes(container: HTMLElement, lineId: string): WordBox[] {
  const line = lineElement(container, lineId);
  if (!line) return [];

  return Array.from(line.querySelectorAll<HTMLElement>("[data-sync-word]")).map((word) => word.getBoundingClientRect());
}

// -- The hook -----------------------------------------------------------------

interface SyncNavigationOptions {
  lines: readonly LyricLine[];
  cursor: SyncCursor;
  granularity: SyncGranularity;
  containerRef: RefObject<HTMLElement | null>;
  /** Write the caret where a step puts it, and mark the write deliberate so it is not walked back. */
  setPosition: (position: SyncCursor) => void;
}

interface SyncNavigation {
  stepWord: (step: Step) => void;
  stepLine: (step: Step) => void;
}

/**
 * Moving the sync caret across the text, one word or one line at a time.
 *
 * A step writes the caret and nothing else: it does not seek and leaves playback alone, so the audio
 * stays where the operator put it while the caret travels to the word being redone.
 *
 * A line step asks the rendered geometry where the caret lands on the line it moves to, and asks
 * again on every press, so a held key follows the words down the page rather than a column of them.
 */
function useSyncNavigation({
  lines,
  cursor,
  granularity,
  containerRef,
  setPosition,
}: SyncNavigationOptions): SyncNavigation {
  const pickWord = useCallback<WordPicker>(
    (lineIndex) => {
      const container = containerRef.current;
      const anchorLine = lines[cursor.lineIndex];
      const targetLine = lines[lineIndex];
      if (!container || !anchorLine || !targetLine) return null;

      const anchor = readWordBoxes(container, anchorLine.id)[cursor.wordIndex];
      const boxes = readWordBoxes(container, targetLine.id);
      if (!anchor || boxes.length === 0) return null;

      const centre = boxCentre(anchor);

      return spatialWordIndex(boxes, centre.x, centre.y);
    },
    [containerRef, cursor, lines],
  );

  const commit = useCallback(
    (next: SyncCursor | null) => {
      if (next) setPosition(next);
    },
    [setPosition],
  );

  const stepWord = useCallback(
    (step: Step) => {
      // At line granularity the line is what the caret addresses, so the word keys walk lines there.
      commit(
        granularity === "line"
          ? stepByLine(lines, cursor, granularity, pickWord, step)
          : stepByWord(lines, cursor, step),
      );
    },
    [commit, cursor, granularity, lines, pickWord],
  );

  const stepLine = useCallback(
    (step: Step) => commit(stepByLine(lines, cursor, granularity, pickWord, step)),
    [commit, cursor, granularity, lines, pickWord],
  );

  return { stepWord, stepLine };
}

// -- Exports ------------------------------------------------------------------

export { useSyncNavigation };
export type { SyncNavigation };
