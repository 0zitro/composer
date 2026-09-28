import { formatLineCount } from "@/utils/format-line-count";
import { describe, expect, it } from "vitest";

describe("formatLineCount", () => {
  it("formats a count of lines", () => {
    expect(formatLineCount(5)).toBe("5 lines");
  });

  describe("edge cases", () => {
    it("uses the singular form for exactly one line", () => {
      expect(formatLineCount(1)).toBe("1 line");
    });

    it("formats zero as plural", () => {
      expect(formatLineCount(0)).toBe("0 lines");
    });
  });
});
