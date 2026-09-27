import { formatFileSize } from "@/utils/format-file-size";
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
