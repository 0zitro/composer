import { estimateRecordBytes } from "@/domain/project/record-bytes";
import { describe, expect, it } from "vitest";

describe("estimateRecordBytes", () => {
  it("is the length of the record's JSON", () => {
    const record = { metadata: { title: "Midnight City" }, lines: [{ id: "l1", text: "Waiting in a car" }] };
    expect(estimateRecordBytes(record)).toBe(JSON.stringify(record).length);
  });

  describe("edge cases", () => {
    it("counts nothing for undefined", () => {
      expect(estimateRecordBytes(undefined)).toBe(0);
    });

    it("counts non-Latin text by characters", () => {
      expect(estimateRecordBytes({ title: "夜に駆ける" })).toBe(JSON.stringify({ title: "夜に駆ける" }).length);
    });
  });

  describe("invariants", () => {
    it("grows when the record grows", () => {
      expect(estimateRecordBytes({ lines: ["a", "b"] })).toBeGreaterThan(estimateRecordBytes({ lines: ["a"] }));
    });
  });
});
