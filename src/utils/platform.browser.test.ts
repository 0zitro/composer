import { isChromium } from "@/utils/platform";
import { describe, expect, it } from "vitest";

describe("isChromium", () => {
  it("is true in this project's real browser tests (Chromium)", () => {
    expect(isChromium).toBe(true);
  });
});
