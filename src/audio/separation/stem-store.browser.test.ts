import {
  beginLoadingStemJob,
  clearStemCache,
  endLoadingStemJob,
  getStem,
  hasStems,
  isStemJobLoading,
  listStemJobs,
  putStem,
  removeStemJobs,
  stemJobKey,
} from "@/audio/separation/stem-store";
import { type StorageSignal, subscribeStorageSignals } from "@/lib/storage-signals";
import { describe, expect, it, vi } from "vitest";

// -- Helpers ------------------------------------------------------------------

function wav(bytes: number): Blob {
  return new Blob([new Uint8Array(bytes)], { type: "audio/wav" });
}

async function separate(hash: string, vocalsBytes = 10, instrumentalBytes = 20): Promise<void> {
  await putStem(hash, "vocals", "fp32", wav(vocalsBytes));
  await putStem(hash, "instrumental", "fp32", wav(instrumentalBytes));
}

function recordSignals(): { seen: StorageSignal[]; stop: () => void } {
  const seen: StorageSignal[] = [];
  const stop = subscribeStorageSignals((signal) => seen.push(signal));
  return { seen, stop };
}

// -- Tests --------------------------------------------------------------------

describe("stem store", () => {
  it("round-trips both stems of a job", async () => {
    await separate("h1");
    expect(await hasStems("h1", "fp32")).toBe(true);
    expect((await getStem("h1", "vocals", "fp32"))?.size).toBe(10);
    expect(await hasStems("h1", "fp16")).toBe(false);
  });

  it("lists each job once with its total size and newest time", async () => {
    await separate("h1", 10, 20);
    const [job] = await listStemJobs();
    expect(job).toMatchObject({ jobKey: stemJobKey("h1", "fp32"), bytes: 30 });
    expect(job?.createdAt).toBeGreaterThan(0);
  });

  it("removes only the named jobs and reports what it freed", async () => {
    await separate("h1", 10, 20);
    await separate("h2", 1, 2);
    const { seen, stop } = recordSignals();
    expect(await removeStemJobs([stemJobKey("h1", "fp32")])).toEqual({ jobs: 1, bytes: 30 });
    stop();
    expect((await listStemJobs()).map((job) => job.jobKey)).toEqual([stemJobKey("h2", "fp32")]);
    expect(seen).toEqual(["media-removed"]);
  });

  it("removes only the named jobs but never a job the guard reports as in use, checked inside the same transaction", async () => {
    await separate("h1", 10, 20);
    const key = stemJobKey("h1", "fp32");
    expect(await removeStemJobs([key], (jobKey) => jobKey === key)).toEqual({ jobs: 0, bytes: 0 });
    expect(await listStemJobs()).toHaveLength(1);
  });

  it("clears every job except the one kept", async () => {
    await separate("h1");
    await separate("h2");
    expect(await clearStemCache(stemJobKey("h2", "fp32"))).toEqual({ jobs: 1, bytes: 30 });
    expect((await listStemJobs()).map((job) => job.jobKey)).toEqual([stemJobKey("h2", "fp32")]);
  });

  it("signals media stored for each stem written", async () => {
    const { seen, stop } = recordSignals();
    await separate("h1");
    stop();
    expect(seen).toEqual(["media-stored", "media-stored"]);
  });

  describe("edge cases", () => {
    it("lists nothing and removes nothing on an empty cache", async () => {
      expect(await listStemJobs()).toEqual([]);
      const { seen, stop } = recordSignals();
      expect(await clearStemCache(null)).toEqual({ jobs: 0, bytes: 0 });
      stop();
      expect(seen).toEqual([]);
    });

    it("clearing with nothing kept removes everything", async () => {
      await separate("h1");
      await separate("h2");
      expect((await clearStemCache(null)).jobs).toBe(2);
      expect(await listStemJobs()).toEqual([]);
    });
  });

  describe("regressions", () => {
    it("regression: still keeps at most three jobs, dropping the oldest", async () => {
      for (const hash of ["h1", "h2", "h3", "h4"]) await separate(hash);
      const keys = (await listStemJobs()).map((job) => job.jobKey).toSorted();
      expect(keys).toEqual(["h2", "h3", "h4"].map((hash) => stemJobKey(hash, "fp32")).toSorted());
    });
  });

  describe("invariants", () => {
    it("breaks a created-at tie by job key order, regardless of write order", async () => {
      const now = vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
      try {
        for (const hash of ["d", "b", "a", "c"]) await separate(hash);
      } finally {
        now.mockRestore();
      }
      const keys = (await listStemJobs()).map((job) => job.jobKey).toSorted();
      expect(keys).toEqual(["b", "c", "d"].map((hash) => stemJobKey(hash, "fp32")).toSorted());
    });
  });
});

describe("stem job in use", () => {
  it("is false before anything marks it loading", () => {
    expect(isStemJobLoading("h1|fp32|v2")).toBe(false);
  });

  it("is true while loading and false once it ends", () => {
    beginLoadingStemJob("h1|fp32|v2");
    expect(isStemJobLoading("h1|fp32|v2")).toBe(true);
    endLoadingStemJob("h1|fp32|v2");
    expect(isStemJobLoading("h1|fp32|v2")).toBe(false);
  });

  describe("invariants", () => {
    it("stays in use while any of two overlapping loads is still running", () => {
      beginLoadingStemJob("h1|fp32|v2");
      beginLoadingStemJob("h1|fp32|v2");
      endLoadingStemJob("h1|fp32|v2");
      expect(isStemJobLoading("h1|fp32|v2")).toBe(true);
      endLoadingStemJob("h1|fp32|v2");
      expect(isStemJobLoading("h1|fp32|v2")).toBe(false);
    });
  });
});
