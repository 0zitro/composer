import {
  KEEP_YOUTUBE_AUDIO_OPTIONS,
  STORAGE_LIMIT_OPTIONS,
  keepYouTubeAudioDescription,
} from "@/ui/settings/storage/storage-options";
import { describe, expect, it } from "vitest";

describe("KEEP_YOUTUBE_AUDIO_OPTIONS", () => {
  it("offers Automatic, Always and Never in that order", () => {
    expect(KEEP_YOUTUBE_AUDIO_OPTIONS.map((option) => option.label)).toEqual(["Automatic", "Always", "Never"]);
  });
});

describe("STORAGE_LIMIT_OPTIONS", () => {
  it("offers 1 GB, 2 GB, 5 GB and No limit in that order", () => {
    expect(STORAGE_LIMIT_OPTIONS.map((option) => option.label)).toEqual(["1 GB", "2 GB", "5 GB", "No limit"]);
  });
});

describe("keepYouTubeAudioDescription", () => {
  it("describes Never regardless of the bridge", () => {
    expect(keepYouTubeAudioDescription("never", true)).toBe("YouTube audio is fetched each time you open a project.");
    expect(keepYouTubeAudioDescription("never", false)).toBe("YouTube audio is fetched each time you open a project.");
  });

  it("describes Always regardless of the bridge", () => {
    expect(keepYouTubeAudioDescription("always", true)).toBe(
      "YouTube audio is kept, so projects open offline. Cleanup can still remove it.",
    );
    expect(keepYouTubeAudioDescription("always", false)).toBe(
      "YouTube audio is kept, so projects open offline. Cleanup can still remove it.",
    );
  });

  it("describes Automatic with the bridge on", () => {
    expect(keepYouTubeAudioDescription("auto", true)).toBe(
      "Composer Bridge is on, so YouTube audio is fetched when you open a project and not kept.",
    );
  });

  it("describes Automatic with the bridge off", () => {
    expect(keepYouTubeAudioDescription("auto", false)).toBe(
      "Composer Bridge is off, so YouTube audio is kept. Fetching it again can fail.",
    );
  });

  describe("edge cases", () => {
    it("ignores the bridge flag for a non automatic rule", () => {
      expect(keepYouTubeAudioDescription("never", true)).toBe(keepYouTubeAudioDescription("never", false));
      expect(keepYouTubeAudioDescription("always", true)).toBe(keepYouTubeAudioDescription("always", false));
    });
  });

  describe("invariants", () => {
    it("always returns a sentence ending in a period", () => {
      for (const rule of ["auto", "always", "never"] as const) {
        for (const bridgeEnabled of [true, false]) {
          expect(keepYouTubeAudioDescription(rule, bridgeEnabled).endsWith(".")).toBe(true);
        }
      }
    });
  });
});
