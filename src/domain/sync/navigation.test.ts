import { describe, expect, it } from "vitest";
import { stepByLine, stepByWord } from "@/domain/sync/navigation";
import { createLine } from "@/test/factories";

const word = (text: string, begin: number, end: number) => ({ text, begin, end });
const blank = () => createLine({ text: "" });

const timed = (text: string, from = 1) =>
  createLine({
    text,
    words: text
      .split(" ")
      .map((part, index) => word(part, from + index, from + index + 1)),
  });

describe("stepByWord", () => {
  describe("within a line", () => {
    const lines = [timed("a b c")];

    it("moves one word forward", () => {
      expect(stepByWord(lines, { lineIndex: 0, wordIndex: 0 }, 1)).toEqual({ lineIndex: 0, wordIndex: 1 });
    });

    it("moves one word back", () => {
      expect(stepByWord(lines, { lineIndex: 0, wordIndex: 2 }, -1)).toEqual({ lineIndex: 0, wordIndex: 1 });
    });
  });

  describe("off the ends of a line", () => {
    const lines = [timed("a b"), blank(), timed("c d")];

    it("rolls back onto the previous line's last word", () => {
      expect(stepByWord(lines, { lineIndex: 2, wordIndex: 0 }, -1)).toEqual({ lineIndex: 0, wordIndex: 1 });
    });

    it("rolls forward onto the next line's first word, stepping over a blank line", () => {
      expect(stepByWord(lines, { lineIndex: 0, wordIndex: 1 }, 1)).toEqual({ lineIndex: 2, wordIndex: 0 });
    });

    it("stays put at the first word of the text", () => {
      expect(stepByWord(lines, { lineIndex: 0, wordIndex: 0 }, -1)).toBeNull();
    });

    it("stays put at the last word of the text", () => {
      expect(stepByWord(lines, { lineIndex: 2, wordIndex: 1 }, 1)).toBeNull();
    });
  });

  describe("the frontier of what a line has timed", () => {
    it("steps onto the next untimed word, which is the slot a tap would write", () => {
      const lines = [createLine({ text: "a b c", words: [word("a ", 1, 2), word("b ", 2, 3)] })];

      expect(stepByWord(lines, { lineIndex: 0, wordIndex: 1 }, 1)).toEqual({ lineIndex: 0, wordIndex: 2 });
    });

    it("does not step past a fully timed line's last word into an empty slot", () => {
      const lines = [timed("a b"), timed("c", 5)];

      expect(stepByWord(lines, { lineIndex: 0, wordIndex: 1 }, 1)).toEqual({ lineIndex: 1, wordIndex: 0 });
    });
  });
});

describe("stepByLine", () => {
  const lines = [timed("a b c"), timed("d e f", 5)];

  describe("with geometry to read", () => {
    it("takes the word the picker names on the target line", () => {
      expect(stepByLine(lines, { lineIndex: 0, wordIndex: 1 }, "word", () => 2, 1)).toEqual({
        lineIndex: 1,
        wordIndex: 2,
      });
    });

    it("asks the picker about the line it is moving to", () => {
      const asked: number[] = [];
      stepByLine(lines, { lineIndex: 1, wordIndex: 1 }, "word", (lineIndex) => {
        asked.push(lineIndex);
        return 0;
      }, -1);

      expect(asked).toEqual([0]);
    });

    it("holds a picked slot within what the target line can take", () => {
      const short = [createLine({ text: "a b c d", words: [word("a ", 1, 2), word("b ", 2, 3)] }), timed("e f")];

      expect(stepByLine(short, { lineIndex: 1, wordIndex: 0 }, "word", () => 3, -1)).toEqual({
        lineIndex: 0,
        wordIndex: 2,
      });
    });
  });

  describe("without geometry to read", () => {
    it("keeps the caret's own word index", () => {
      expect(stepByLine(lines, { lineIndex: 0, wordIndex: 2 }, "word", () => null, 1)).toEqual({
        lineIndex: 1,
        wordIndex: 2,
      });
    });

    it("holds that index within what the target line can take", () => {
      const short = [createLine({ text: "a b c d", words: [word("a ", 1, 2), word("b ", 2, 3)] }), timed("e")];

      expect(stepByLine(short, { lineIndex: 1, wordIndex: 3 }, "word", () => null, -1)).toEqual({
        lineIndex: 0,
        wordIndex: 2,
      });
    });
  });

  describe("line granularity", () => {
    it("addresses the line as a whole, whatever the picker says", () => {
      expect(stepByLine(lines, { lineIndex: 0, wordIndex: 1 }, "line", () => 2, 1)).toEqual({
        lineIndex: 1,
        wordIndex: 0,
      });
    });
  });

  describe("the bounds of the text", () => {
    const spaced = [timed("a b"), blank(), timed("c d", 5)];

    it("steps over a line with no main lyrics", () => {
      expect(stepByLine(spaced, { lineIndex: 0, wordIndex: 0 }, "word", () => 1, 1)).toEqual({
        lineIndex: 2,
        wordIndex: 1,
      });
    });

    it("stays put at the top of the text", () => {
      expect(stepByLine(lines, { lineIndex: 0, wordIndex: 0 }, "word", () => 0, -1)).toBeNull();
    });

    it("stays put at the bottom of the text", () => {
      expect(stepByLine(lines, { lineIndex: 1, wordIndex: 0 }, "word", () => 0, 1)).toBeNull();
    });
  });
});
