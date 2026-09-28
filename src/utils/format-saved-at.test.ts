import { formatSavedAt } from "@/utils/format-saved-at";
import { describe, expect, it } from "vitest";

describe("formatSavedAt", () => {
  it("formats a timestamp in the reader's locale", () => {
    expect(formatSavedAt(1_715_000_000_000)).toBe(new Date(1_715_000_000_000).toLocaleString());
  });

  describe("edge cases", () => {
    it("reads unknown without a timestamp", () => {
      expect(formatSavedAt(undefined)).toBe("unknown");
      expect(formatSavedAt(0)).toBe("unknown");
    });
  });
});
