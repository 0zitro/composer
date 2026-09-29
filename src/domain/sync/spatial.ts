// -- Types --------------------------------------------------------------------

/** One rendered word: the box its text occupies on screen, in viewport coordinates. */
interface WordBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// -- Selection ----------------------------------------------------------------

/** The point a caret step is anchored on, and the point a pick measures from: the box's centre. */
function boxCentre(box: WordBox): { x: number; y: number } {
  return { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
}

/** How far `x` stands outside the box, and `0` where it is inside it. Never negative: a distance. */
function horizontalGap(box: WordBox, x: number): number {
  if (x < box.left) return box.left - x;
  if (x > box.right) return x - box.right;
  return 0;
}

/**
 * The word a caret standing at `anchorX`/`anchorY` lands on, out of one line's boxes.
 *
 * The caret is a line rather than a point: read down from where it stands, and the word it crosses is
 * the word it lands on. A caret that falls in the gap between two words takes the nearer one, and a
 * caret past the last word is nearest to it — which is the clamp, so the ends of a line need no case
 * of their own.
 *
 * The row is decided before the word. A line that wrapped is two rows of boxes, and the nearer row is
 * the one the caret reads; on a single row — the ordinary case — that comparison ties everywhere and
 * only the horizontal distance decides.
 *
 * A tie goes to the earlier index, and since a row's boxes are in reading order that is the leftmost.
 */
function spatialWordIndex(boxes: readonly WordBox[], anchorX: number, anchorY: number): number {
  if (boxes.length === 0) return 0;

  let best = 0;
  let bestVertical = Number.POSITIVE_INFINITY;
  let bestHorizontal = Number.POSITIVE_INFINITY;

  for (const [index, box] of boxes.entries()) {
    const vertical = Math.abs(boxCentre(box).y - anchorY);
    const horizontal = horizontalGap(box, anchorX);
    if (vertical < bestVertical || (vertical === bestVertical && horizontal < bestHorizontal)) {
      best = index;
      bestVertical = vertical;
      bestHorizontal = horizontal;
    }
  }

  return best;
}

// -- Exports ------------------------------------------------------------------

export { boxCentre, spatialWordIndex };
export type { WordBox };
