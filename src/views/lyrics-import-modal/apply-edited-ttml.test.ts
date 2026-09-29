import { DEFAULT_AGENTS } from "@/domain/agent/colors";
import { useProjectStore } from "@/stores/project";
import { createLine } from "@/test/factories";
import { generateTTML } from "@/utils/ttml";
import { applyEditedTtml } from "@/views/lyrics-import-modal/import-lyrics";
import { beforeEach, describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

function ttml(body: string, head = ""): string {
  return `<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata"><head><metadata>${head}</metadata></head><body><div>${body}</div></body></tt>`;
}

const TWO_LINES = ttml(
  '<p begin="00:01.000" end="00:02.000">Brand new</p><p begin="00:02.000" end="00:03.000">Second line</p>',
);

function lineTexts(): string[] {
  return useProjectStore.getState().lines.map((line) => line.text);
}

// -- Tests --------------------------------------------------------------------

describe("applyEditedTtml", () => {
  beforeEach(() => {
    useProjectStore.setState({
      lines: [createLine({ text: "Old line", begin: 0, end: 1 })],
      agents: DEFAULT_AGENTS,
      metadata: { title: "Kept title", artists: [], album: "", duration: 0 },
    });
  });

  it("replaces the lines with what the edited TTML encodes", () => {
    expect(applyEditedTtml(TWO_LINES, 0)).toEqual({ status: "applied", skipped: 0 });
    expect(lineTexts()).toEqual(["Brand new", "Second line"]);
    const [first] = useProjectStore.getState().lines;
    expect(first?.begin).toBe(1);
    expect(first?.end).toBe(2);
  });

  it("keeps word timing from the TTML", () => {
    applyEditedTtml(
      ttml(
        '<p begin="00:01.000" end="00:02.000"><span begin="00:01.000" end="00:01.500">Hel</span><span begin="00:01.500" end="00:02.000">lo</span></p>',
      ),
      0,
    );
    const [line] = useProjectStore.getState().lines;
    expect(line?.words?.map((word) => word.text)).toEqual(["Hel", "lo"]);
  });

  it("round-trips Composer's own export unchanged", () => {
    applyEditedTtml(TWO_LINES, 0);
    const before = useProjectStore.getState();
    const generated = generateTTML({
      metadata: before.metadata,
      agents: before.agents,
      lines: before.lines,
      groups: before.groups,
      duration: 0,
    });
    applyEditedTtml(generated, 0);
    expect(lineTexts()).toEqual(["Brand new", "Second line"]);
  });

  it("is one undo step", () => {
    applyEditedTtml(TWO_LINES, 0);
    useProjectStore.getState().undo();
    expect(lineTexts()).toEqual(["Old line"]);
  });

  describe("error paths", () => {
    it("leaves the project alone when the text is not TTML", () => {
      const result = applyEditedTtml("CUSTOM EDITED CONTENT", 0);
      expect(result.status).toBe("unreadable");
      expect(lineTexts()).toEqual(["Old line"]);
    });

    it("leaves the project alone when the TTML has no lines", () => {
      expect(applyEditedTtml(ttml(""), 0).status).toBe("unreadable");
      expect(lineTexts()).toEqual(["Old line"]);
    });

    it("says why it could not read the TTML", () => {
      const result = applyEditedTtml("not xml at all", 0);
      expect(result).toMatchObject({ status: "unreadable" });
      if (result.status === "unreadable") expect(result.message).toMatch(/edited TTML/);
    });
  });

  describe("edge cases", () => {
    it("never runs background extraction on the edited TTML", () => {
      applyEditedTtml(ttml('<p begin="00:01.000" end="00:02.000">Hello (ooh)</p>'), 0);
      expect(lineTexts()).toEqual(["Hello (ooh)"]);
    });
  });
});
