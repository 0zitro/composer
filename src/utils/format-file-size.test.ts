import { formatFileSize, formatMegabytes } from "@/utils/format-file-size";
import { describe, expect, it } from "vitest";

describe("formatFileSize", () => {
  it("uses bytes, kilobytes or megabytes with one decimal", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(9_830)).toBe("9.6 KB");
    expect(formatFileSize(43_830_067)).toBe("41.8 MB");
  });

  describe("edge cases", () => {
    it("formats zero and the unit boundaries", () => {
      expect(formatFileSize(0)).toBe("0 B");
      expect(formatFileSize(1023)).toBe("1023 B");
      expect(formatFileSize(1024)).toBe("1.0 KB");
      expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    });
  });
});

describe("formatFileSize regressions", () => {
  it("regression: a size that rounds up to 1024 KB shows as 1.0 MB", () => {
    expect(formatFileSize(1_048_575)).toBe("1.0 MB");
    expect(formatFileSize(1_048_525)).toBe("1.0 MB");
  });

  it("keeps the largest size that stays under 1024 KB in kilobytes", () => {
    expect(formatFileSize(1_048_524)).toBe("1023.9 KB");
  });
});

describe("formatMegabytes", () => {
  it("always uses megabytes with one decimal", () => {
    expect(formatMegabytes(87_031_808)).toBe("83.0 MB");
  });

  describe("edge cases", () => {
    it("shows zero and small sizes in megabytes", () => {
      expect(formatMegabytes(0)).toBe("0.0 MB");
      expect(formatMegabytes(512)).toBe("0.0 MB");
    });
  });
});
