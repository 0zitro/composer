import { displayTitle } from "@/domain/project/display-title";
import { describe, expect, it } from "vitest";

describe("displayTitle", () => {
  it("returns the title when it is set", () => {
    expect(displayTitle("Midnight City")).toBe("Midnight City");
  });

  describe("edge cases", () => {
    it("falls back to Untitled for an empty title", () => {
      expect(displayTitle("")).toBe("Untitled");
    });

    it("keeps a whitespace-only title as is", () => {
      expect(displayTitle(" ")).toBe(" ");
    });
  });
});
