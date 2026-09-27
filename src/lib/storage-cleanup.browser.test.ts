import { listStemJobs, putStem, stemJobKey } from "@/audio/separation/stem-store";
import { storageUsage } from "@/domain/storage/usage";
import { openProject } from "@/lib/open-project";
import { adoptOpenProjectId } from "@/lib/open-project-session";
import { PROJECT_INDEX_STORE_NAME, setInStore } from "@/lib/persistence-idb";
import { loadProjectAudio } from "@/lib/project-audio";
import { listProjectIndex, loadProjectIndexEntry } from "@/lib/project-repository";
import { type CleanupContext, runSmartCleanup } from "@/lib/storage-cleanup";
import { createAudioFile } from "@/test/audio-fixtures";
import { indexEntry } from "@/test/index-entries";
import { seedStoredProject } from "@/test/projects";
import { describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

const EVERYTHING: Omit<CleanupContext, "limitBytes"> = { smartCleanup: true, openStemJobKey: null, storageFull: false };

async function seedYouTube(id: string, openedAt: number): Promise<void> {
  await seedStoredProject(id, {
    project: { audioSource: { kind: "youtube", videoId: `v-${id}` } },
    audio: createAudioFile(`${id}.opus`),
  });
  await setInStore(PROJECT_INDEX_STORE_NAME, id, { ...(await loadProjectIndexEntry(id)), openedAt });
}

async function seedLocal(id: string): Promise<void> {
  await seedStoredProject(id, {
    project: { audioSource: { kind: "file", name: `${id}.wav` } },
    audio: createAudioFile(`${id}.wav`),
  });
}

async function seedStems(hash: string): Promise<void> {
  await putStem(hash, "vocals", "fp32", new Blob([new Uint8Array(64)]));
  await putStem(hash, "instrumental", "fp32", new Blob([new Uint8Array(64)]));
}

async function usedBytes(): Promise<number> {
  return storageUsage(await listProjectIndex(), await listStemJobs()).totalBytes;
}

// -- Tests --------------------------------------------------------------------

describe("runSmartCleanup", () => {
  it("frees space past the limit by removing stems first", async () => {
    await seedStems("h1");
    await seedYouTube("yt", 10);
    const result = await runSmartCleanup({ ...EVERYTHING, limitBytes: (await usedBytes()) - 1 });
    expect(result).toEqual({ freedBytes: 128, removedStemJobs: 1, removedYouTubeAudio: 0 });
    expect(await listStemJobs()).toEqual([]);
    expect(await loadProjectAudio("yt")).toBeDefined();
  });

  it("then removes YouTube audio least recently opened first", async () => {
    await seedYouTube("recent", 900);
    await seedYouTube("stale", 100);
    const staleBytes = (await loadProjectIndexEntry("stale"))?.storedAudioBytes ?? 0;
    const result = await runSmartCleanup({ ...EVERYTHING, limitBytes: (await usedBytes()) - 1 });
    expect(result).toEqual({ freedBytes: staleBytes, removedStemJobs: 0, removedYouTubeAudio: 1 });
    expect(await loadProjectAudio("stale")).toBeUndefined();
    expect(await loadProjectAudio("recent")).toBeDefined();
  });

  it("frees plenty after a quota error even with no limit", async () => {
    await seedStems("h1");
    await seedYouTube("yt", 10);
    const result = await runSmartCleanup({ ...EVERYTHING, limitBytes: undefined, storageFull: true });
    expect(result.removedStemJobs).toBe(1);
    expect(result.removedYouTubeAudio).toBe(1);
  });

  describe("never removes", () => {
    it("local files", async () => {
      await seedLocal("local");
      await runSmartCleanup({ ...EVERYTHING, limitBytes: 0 });
      expect(await loadProjectAudio("local")).toBeDefined();
    });

    it("the open project's audio", async () => {
      await seedYouTube("open", 1);
      adoptOpenProjectId("open");
      await runSmartCleanup({ ...EVERYTHING, limitBytes: 0 });
      expect(await loadProjectAudio("open")).toBeDefined();
    });

    it("the open project's stems", async () => {
      await seedStems("mine");
      await runSmartCleanup({ ...EVERYTHING, limitBytes: 0, openStemJobKey: stemJobKey("mine", "fp32") });
      expect((await listStemJobs()).map((job) => job.jobKey)).toEqual([stemJobKey("mine", "fp32")]);
    });

    it("a project's audio if it starts opening between planning and removal", async () => {
      await seedYouTube("opening", 1);
      const opening = openProject("opening");
      const result = await runSmartCleanup({ ...EVERYTHING, limitBytes: 0 });
      expect(result.removedYouTubeAudio).toBe(0);
      expect(await loadProjectAudio("opening")).toBeDefined();
      await opening;
    });

    it("a project's audio if it becomes the open project during a run", async () => {
      await seedYouTube("switching", 1);
      const resultPromise = runSmartCleanup({ ...EVERYTHING, limitBytes: 0 });
      adoptOpenProjectId("switching");
      await resultPromise;
      expect(await loadProjectAudio("switching")).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("does nothing with Smart cleanup off", async () => {
      await seedStems("h1");
      await seedYouTube("yt", 1);
      const result = await runSmartCleanup({ ...EVERYTHING, smartCleanup: false, limitBytes: 0, storageFull: true });
      expect(result).toEqual({ freedBytes: 0, removedStemJobs: 0, removedYouTubeAudio: 0 });
      expect(await listStemJobs()).toHaveLength(1);
    });

    it("does nothing under the limit", async () => {
      await seedYouTube("yt", 1);
      const result = await runSmartCleanup({ ...EVERYTHING, limitBytes: (await usedBytes()) + 1 });
      expect(result.freedBytes).toBe(0);
    });

    it("handles entries saved before openedAt existed", async () => {
      await seedYouTube("old", 1);
      const { openedAt: _openedAt, ...withoutOpenedAt } = (await loadProjectIndexEntry("old")) ?? indexEntry("old");
      await setInStore(PROJECT_INDEX_STORE_NAME, "old", withoutOpenedAt);
      const result = await runSmartCleanup({ ...EVERYTHING, limitBytes: 0 });
      expect(result.removedYouTubeAudio).toBe(1);
    });
  });

  describe("invariants", () => {
    it("the index and the blobs agree after cleanup", async () => {
      await seedYouTube("a", 1);
      await seedYouTube("b", 2);
      await runSmartCleanup({ ...EVERYTHING, limitBytes: 0 });
      for (const id of ["a", "b"]) {
        const stored = (await loadProjectIndexEntry(id))?.storedAudioBytes ?? 0;
        expect(stored === 0).toBe((await loadProjectAudio(id)) === undefined);
      }
    });
  });
});
