import type { LyricLine } from "@/domain/line/model";
import type { SyncGranularity } from "@/domain/line/sync-progress";
import type { SyncCursor } from "@/domain/sync/cursor";
import { createLine } from "@/test/factories";
import { render } from "@/test/render";
import { ScrollableLine } from "@/views/sync/scrollable-line";
import { useSyncNavigation } from "@/views/sync/use-sync-navigation";
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";

// -- Harness ------------------------------------------------------------------
//
// The hook is exercised over real rendered lines, so the boxes its reader measures are the ones the
// sync view actually lays out. The caret is written into the document, which is what a step changes.
//
// The lines are given the width of the app's panel: a synced word carries its timing inputs, so a
// wrapper is wide and a narrow container would wrap every line onto several rows.

const word = (text: string, begin: number, end: number) => ({ text, begin, end });

interface HarnessProps {
  lines: LyricLine[];
  granularity?: SyncGranularity;
  start?: SyncCursor;
}

const Harness: React.FC<HarnessProps> = ({ lines, granularity = "word", start = { lineIndex: 0, wordIndex: 0 } }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<SyncCursor>(start);
  const navigation = useSyncNavigation({ lines, cursor: position, granularity, containerRef, setPosition });

  return (
    <div>
      <output>{`${position.lineIndex}:${position.wordIndex}`}</output>
      <button type="button" onClick={() => navigation.stepLine(-1)}>
        line-up
      </button>
      <button type="button" onClick={() => navigation.stepLine(1)}>
        line-down
      </button>
      <button type="button" onClick={() => navigation.stepWord(-1)}>
        word-previous
      </button>
      <button type="button" onClick={() => navigation.stepWord(1)}>
        word-next
      </button>
      <div ref={containerRef} style={{ width: 1400 }}>
        {lines.map((line, index) => (
          <ScrollableLine
            key={line.id}
            lineId={line.id}
            lineNumber={index + 1}
            text={line.text}
            words={line.words}
            isCurrent={false}
            granularity={granularity}
            currentTime={0}
            editMode={false}
            onClick={() => {}}
          />
        ))}
      </div>
    </div>
  );
};

async function pressAndRead(screen: Awaited<ReturnType<typeof render>>, name: string): Promise<string> {
  await screen.getByRole("button", { name, exact: true }).click();

  return screen.container.querySelector("output")?.textContent ?? "";
}

// -- The lines the tests step across ------------------------------------------
//
// The first word of `LONG` is wider than the timing inputs under it, so its second word starts far to
// the right; the second word of `SHORT` starts right beside its first. A caret standing on `z` is
// therefore over the *first* word of the line above, though it is the second word of its own line.

const LONG = createLine({
  text: `${"w".repeat(40)} x`,
  words: [word(`${"w".repeat(40)} `, 1, 2), word("x", 2, 3)],
});
const SHORT = createLine({ text: "y z", words: [word("y ", 4, 5), word("z", 5, 6)] });

const ALPHA = createLine({ text: "alpha beta", words: [word("alpha ", 1, 2), word("beta", 2, 3)] });
const GAMMA = createLine({ text: "gamma", words: [word("gamma", 4, 5)] });

// -- Tests --------------------------------------------------------------------

describe("useSyncNavigation", () => {
  describe("the word comes from the geometry, not the cursor's index", () => {
    it("lands on the word the caret stands over, not the word of the same index", async () => {
      const screen = await render(<Harness lines={[LONG, SHORT]} start={{ lineIndex: 1, wordIndex: 1 }} />);

      // `z` is index 1, and it stands over index 0 of the line above.
      expect(await pressAndRead(screen, "line-up")).toBe("0:0");
    });
  });

  describe("a word step", () => {
    it("moves along the line", async () => {
      const screen = await render(<Harness lines={[ALPHA, GAMMA]} />);

      expect(await pressAndRead(screen, "word-next")).toBe("0:1");
      expect(await pressAndRead(screen, "word-previous")).toBe("0:0");
    });

    it("rolls forward onto the next line's first word", async () => {
      const screen = await render(<Harness lines={[ALPHA, GAMMA]} start={{ lineIndex: 0, wordIndex: 1 }} />);

      expect(await pressAndRead(screen, "word-next")).toBe("1:0");
    });

    it("rolls back onto the previous line's last word", async () => {
      const screen = await render(<Harness lines={[ALPHA, GAMMA]} start={{ lineIndex: 1, wordIndex: 0 }} />);

      expect(await pressAndRead(screen, "word-previous")).toBe("0:1");
    });

    it("stays put at the end of the text", async () => {
      const screen = await render(<Harness lines={[ALPHA, GAMMA]} />);

      expect(await pressAndRead(screen, "word-previous")).toBe("0:0");
      expect(await pressAndRead(screen, "word-next")).toBe("0:1");
      expect(await pressAndRead(screen, "word-next")).toBe("1:0");
      expect(await pressAndRead(screen, "word-next")).toBe("1:0");
    });
  });

  describe("a line step", () => {
    it("anchors on the caret's own word, and reads the geometry again on the next step", async () => {
      const screen = await render(<Harness lines={[LONG, SHORT]} start={{ lineIndex: 1, wordIndex: 1 }} />);

      // Up from `z` onto the long word; back down from there, the caret stands over `z` again.
      expect(await pressAndRead(screen, "line-up")).toBe("0:0");
      expect(await pressAndRead(screen, "line-down")).toBe("1:1");
    });

    it("stays put at the end of the text", async () => {
      const screen = await render(<Harness lines={[ALPHA, GAMMA]} />);

      expect(await pressAndRead(screen, "line-up")).toBe("0:0");
      expect(await pressAndRead(screen, "line-down")).toBe("1:0");
      expect(await pressAndRead(screen, "line-down")).toBe("1:0");
    });
  });

  describe("line granularity", () => {
    it("makes the word keys walk lines", async () => {
      const screen = await render(<Harness lines={[ALPHA, GAMMA]} granularity="line" />);

      expect(await pressAndRead(screen, "word-next")).toBe("1:0");
      expect(await pressAndRead(screen, "word-previous")).toBe("0:0");
    });
  });
});
