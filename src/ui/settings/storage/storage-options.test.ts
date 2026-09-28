import { KEEP_YOUTUBE_AUDIO_OPTIONS, STORAGE_LIMIT_OPTIONS } from "@/ui/settings/storage/storage-options";
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
