import { describe, expect, it } from "vitest";
import { type WordBox, spatialWordIndex } from "@/domain/sync/spatial";

// -- Fixtures -----------------------------------------------------------------
//
// The two lines below are the boxes the annotated screenshot measured, in viewport pixels. The caret
// word `wasted` occupies x 934–1045 of the current line, whose band is y 600–640; the arrows the
// operator drew from it stand at x 993.5 (up) and x 998.5 (down).

function box(left: number, right: number): WordBox {
  return { left, right, top: 0, bottom: 20 };
}

function row(boxes: readonly WordBox[], top: number, bottom: number): WordBox[] {
  return boxes.map((b) => ({ ...b, top, bottom }));
}

const ABOVE = row(
  [box(630, 667), box(680, 733), box(747, 776), box(790, 830), box(844, 882), box(896, 942), box(955, 990), box(1004, 1059)],
  505,
  535,
);

const BELOW = row(
  [
    box(603, 646),
    box(660, 670),
    box(682, 691),
    box(706, 758),
    box(771, 835),
    box(849, 927),
    box(941, 978),
    box(991, 1022),
    box(1036, 1087),
  ],
  703,
  733,
);

const CARET_Y = 620;

// -- Tests --------------------------------------------------------------------

describe("spatialWordIndex", () => {
  describe("the annotated case", () => {
    it("lands on the seventh word of the line above, `you`", () => {
      // 993.5 is 3.5px outside `you` (955–990) and 10.5px outside `down` (1004–1059).
      expect(spatialWordIndex(ABOVE, 993.5, CARET_Y)).toBe(6);
    });

    it("lands on the eighth word of the line below, `the`", () => {
      expect(spatialWordIndex(BELOW, 998.5, CARET_Y)).toBe(7);
    });

    it("takes the word the caret stands inside, read at that word's own centre", () => {
      expect(spatialWordIndex(ABOVE, 989.5, CARET_Y)).toBe(6);
    });
  });

  describe("the clamp at the ends of a line", () => {
    it("takes the last word when the caret stands past it", () => {
      expect(spatialWordIndex(BELOW, 1400, CARET_Y)).toBe(8);
    });

    it("takes the first word when the caret stands before it", () => {
      expect(spatialWordIndex(BELOW, 100, CARET_Y)).toBe(0);
    });
  });

  describe("the row is decided before the word", () => {
    it("takes the nearer row even when that row's word is further away horizontally", () => {
      const wrapped = [box(0, 50), box(60, 110), { ...box(0, 50), top: 30, bottom: 50 }];

      expect(spatialWordIndex(wrapped, 105, 40)).toBe(2);
    });
  });

  describe("edge cases", () => {
    it("resolves to the first word when the line has no boxes at all", () => {
      expect(spatialWordIndex([], 10, 10)).toBe(0);
    });

    it("takes the earlier of two equally near words", () => {
      // x 50 stands 10px from either side of the gap between them.
      expect(spatialWordIndex([box(0, 40), box(60, 100)], 50, 10)).toBe(0);
    });
  });
});
