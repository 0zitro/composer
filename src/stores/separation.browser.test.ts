import { hashFile } from "@/audio/separation/audio-codec";
import { isStemJobLoading, listStemJobs, putStem, stemJobKey } from "@/audio/separation/stem-store";
import { useAudioStore } from "@/stores/audio";
import { useSeparationStore } from "@/stores/separation";
import { createAudioFile } from "@/test/audio-fixtures";
import { describe, expect, it } from "vitest";

// -- Tests --------------------------------------------------------------------

describe("refreshForCurrentSource", () => {
  it("marks the job key in use while it reads cached stems and clears it once ready", async () => {
    const file = createAudioFile("song.wav");
    const audioHash = await hashFile(file);
    await putStem(audioHash, "vocals", "fp32", new Blob([new Uint8Array(20_000_000)]));
    await putStem(audioHash, "instrumental", "fp32", new Blob([new Uint8Array(20_000_000)]));
    const jobKey = stemJobKey(audioHash, "fp32");

    useAudioStore.getState().setSource({ type: "file", file });
    const refreshing = useSeparationStore.getState().refreshForCurrentSource();
    await expect.poll(() => isStemJobLoading(jobKey), { interval: 1 }).toBe(true);
    await refreshing;

    expect(isStemJobLoading(jobKey)).toBe(false);
    expect(useSeparationStore.getState().jobKey).toBe(jobKey);
    expect(useSeparationStore.getState().status).toBe("ready");
    expect((await listStemJobs()).map((job) => job.jobKey)).toContain(jobKey);
  });

  describe("edge cases", () => {
    it("clears the marker even when no cached stems exist for the job", async () => {
      const file = createAudioFile("no-stems.wav");
      const audioHash = await hashFile(file);
      const jobKey = stemJobKey(audioHash, "fp32");

      useAudioStore.getState().setSource({ type: "file", file });
      const refreshing = useSeparationStore.getState().refreshForCurrentSource();
      await refreshing;

      expect(isStemJobLoading(jobKey)).toBe(false);
      expect(useSeparationStore.getState().jobKey).toBe(jobKey);
      expect(useSeparationStore.getState().status).toBe("idle");
    });
  });
});
