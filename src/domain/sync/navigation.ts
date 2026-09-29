import type { LyricLine } from "@/domain/line/model";
import { type SyncGranularity, timedWordCount, wordSlotCount } from "@/domain/line/sync-progress";
import { nextSyncableLineIndex, prevSyncableLineIndex, type SyncCursor } from "@/domain/sync/cursor";

// -- Types --------------------------------------------------------------------

/** A step along the text: `-1` towards the top of it, `1` towards the bottom. */
type Step = -1 | 1;

/** Where a line's own rendered geometry puts a caret standing above or below it, or `null` when
 *  that geometry cannot be read -- the line is not on screen, or nothing marked it. */
type WordPicker = (lineIndex: number) => number | null;

// -- Slots --------------------------------------------------------------------

/**
 * The last word slot of a line the sync cursor can rest on.
 *
 * The resolver holds a stored word index within the words a line has timed, so a slot past that
 * count is not reachable: the next render would pull the caret back to the frontier. The frontier --
 * the next untimed word -- is the slot a tap writes, and it is reachable.
 *
 * A line whose text is a single word has no slot after it, and a line with no words at all has only
 * slot zero, which is also what the resolver leaves.
 */
function lastReachableWordIndex(line: LyricLine): number {
  return Math.min(timedWordCount(line), Math.max(0, wordSlotCount(line) - 1));
}

function clampWordIndex(line: LyricLine, wordIndex: number): number {
  return Math.max(0, Math.min(wordIndex, lastReachableWordIndex(line)));
}

// -- Steps --------------------------------------------------------------------

function neighbourLineIndex(lines: readonly LyricLine[], fromIndex: number, step: Step): number {
  return step < 0 ? prevSyncableLineIndex(lines, fromIndex) : nextSyncableLineIndex(lines, fromIndex);
}

/**
 * One word along the line, and off either end of it to the neighbouring syncable line: backwards
 * onto that line's last reachable word, forwards onto its first. At either end of the text the caret
 * stays where it is, which `null` says.
 *
 * A line with no main lyrics is stepped over rather than rested on, because the resolver would not
 * leave the caret there.
 */
function stepByWord(lines: readonly LyricLine[], cursor: SyncCursor, step: Step): SyncCursor | null {
  const line = lines[cursor.lineIndex];
  if (!line) return null;

  const wordIndex = cursor.wordIndex + step;
  if (wordIndex >= 0 && wordIndex <= lastReachableWordIndex(line)) {
    return { lineIndex: cursor.lineIndex, wordIndex };
  }

  const lineIndex = neighbourLineIndex(lines, cursor.lineIndex, step);
  const neighbour = lines[lineIndex];
  if (!neighbour) return null;

  return { lineIndex, wordIndex: step < 0 ? lastReachableWordIndex(neighbour) : 0 };
}

/**
 * One line along the text, keeping the caret's place within it.
 *
 * The word is the one the picker names from the target line's rendered geometry, so the caret reads
 * down the page rather than across a column: it is re-read on every step, which is what makes a
 * repeated step follow the words instead of a stored goal. Where there is no geometry to read, the
 * caret keeps the word index it had, held within what the target line can take.
 *
 * Line granularity addresses a line as a whole, so the word index there is always the first.
 */
function stepByLine(
  lines: readonly LyricLine[],
  cursor: SyncCursor,
  granularity: SyncGranularity,
  pickWord: WordPicker,
  step: Step,
): SyncCursor | null {
  const lineIndex = neighbourLineIndex(lines, cursor.lineIndex, step);
  const line = lines[lineIndex];
  if (!line) return null;

  if (granularity === "line") return { lineIndex, wordIndex: 0 };

  return { lineIndex, wordIndex: clampWordIndex(line, pickWord(lineIndex) ?? cursor.wordIndex) };
}

// -- Exports ------------------------------------------------------------------

export { stepByLine, stepByWord };
export type { Step, WordPicker };
