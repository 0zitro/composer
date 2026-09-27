import { projectStage, syncedPercent } from "@/domain/project/progress";
import { describe, expect, it } from "vitest";

describe("projectStage", () => {
  it("is not-synced when no line has timing", () => {
    expect(projectStage({ lineCount: 12, syncedLineCount: 0 })).toBe("not-synced");
  });

  it("is syncing when some lines have timing", () => {
    expect(projectStage({ lineCount: 12, syncedLineCount: 5 })).toBe("syncing");
  });

  it("is synced when every line has timing", () => {
    expect(projectStage({ lineCount: 12, syncedLineCount: 12 })).toBe("synced");
  });

  describe("edge cases", () => {
    it("a project with no lines is not-synced", () => {
      expect(projectStage({ lineCount: 0, syncedLineCount: 0 })).toBe("not-synced");
    });

    it("a single synced line is synced", () => {
      expect(projectStage({ lineCount: 1, syncedLineCount: 1 })).toBe("synced");
    });
  });
});

describe("syncedPercent", () => {
  it("rounds the share of synced lines", () => {
    expect(syncedPercent({ lineCount: 3, syncedLineCount: 1 })).toBe(33);
    expect(syncedPercent({ lineCount: 3, syncedLineCount: 2 })).toBe(67);
  });

  describe("edge cases", () => {
    it("is 0 for a project with no lines", () => {
      expect(syncedPercent({ lineCount: 0, syncedLineCount: 0 })).toBe(0);
    });
  });

  describe("invariants", () => {
    it("never leaves 0 to 100, even for inconsistent counts", () => {
      expect(syncedPercent({ lineCount: 2, syncedLineCount: 5 })).toBe(100);
      expect(syncedPercent({ lineCount: 2, syncedLineCount: -1 })).toBe(0);
    });
  });
});
