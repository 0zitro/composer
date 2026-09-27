import {
  clearCachedYouTubeAudio,
  loadProjectAudio,
  removeCachedYouTubeAudio,
  saveProjectAudio,
  unindexedAudioBytes,
} from "@/lib/project-audio";
import { loadProjectIndexEntry, removeProjectData, saveProjectRecordWithAudio } from "@/lib/project-repository";
import { type StorageSignal, subscribeStorageSignals } from "@/lib/storage-signals";
import { createAudioFile } from "@/test/audio-fixtures";
import { seedStoredProject, storedProject } from "@/test/projects";
import { describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

async function seedYouTube(id: string): Promise<File> {
  const audio = createAudioFile(`${id}.opus`);
  await seedStoredProject(id, { project: { audioSource: { kind: "youtube", videoId: `v-${id}` } }, audio });
  return audio;
}

async function seedLocal(id: string): Promise<File> {
  const audio = createAudioFile(`${id}.wav`);
  await seedStoredProject(id, { project: { audioSource: { kind: "file", name: `${id}.wav` } }, audio });
  return audio;
}

function recordSignals(): { seen: StorageSignal[]; stop: () => void } {
  const seen: StorageSignal[] = [];
  const stop = subscribeStorageSignals((signal) => seen.push(signal));
  return { seen, stop };
}

// -- Tests --------------------------------------------------------------------

describe("removeCachedYouTubeAudio", () => {
  it("removes the blob and zeroes the index size together, keeping the project a YouTube project", async () => {
    const audio = await seedYouTube("yt");
    expect(await removeCachedYouTubeAudio("yt")).toBe(audio.size);
    expect(await loadProjectAudio("yt")).toBeUndefined();
    expect(await loadProjectIndexEntry("yt")).toMatchObject({ audioKind: "youtube", storedAudioBytes: 0 });
  });

  it("never removes a local file", async () => {
    await seedLocal("local");
    expect(await removeCachedYouTubeAudio("local")).toBe(0);
    expect(await loadProjectAudio("local")).toBeDefined();
  });

  describe("edge cases", () => {
    it("frees nothing when the YouTube audio is not stored", async () => {
      await seedStoredProject("streamed", { project: { audioSource: { kind: "youtube", videoId: "v" } } });
      expect(await removeCachedYouTubeAudio("streamed")).toBe(0);
    });

    it("frees nothing for an unknown project", async () => {
      expect(await removeCachedYouTubeAudio("nobody")).toBe(0);
    });
  });

  describe("regressions", () => {
    it("regression: removing audio of a project deleted in the meantime never brings its index entry back", async () => {
      await seedYouTube("gone");
      await removeProjectData("gone");
      expect(await removeCachedYouTubeAudio("gone")).toBe(0);
      expect(await loadProjectIndexEntry("gone")).toBeUndefined();
    });
  });
});

describe("clearCachedYouTubeAudio", () => {
  it("removes every cached YouTube audio except the kept project's and never local files", async () => {
    const first = await seedYouTube("yt1");
    const second = await seedYouTube("yt2");
    await seedYouTube("open");
    await seedLocal("local");
    expect(await clearCachedYouTubeAudio("open")).toEqual({ projects: 2, bytes: first.size + second.size });
    expect(await loadProjectAudio("yt1")).toBeUndefined();
    expect(await loadProjectAudio("yt2")).toBeUndefined();
    expect(await loadProjectAudio("open")).toBeDefined();
    expect(await loadProjectAudio("local")).toBeDefined();
    expect((await loadProjectIndexEntry("yt1"))?.storedAudioBytes).toBe(0);
  });

  describe("edge cases", () => {
    it("removes nothing on an empty device", async () => {
      expect(await clearCachedYouTubeAudio(undefined)).toEqual({ projects: 0, bytes: 0 });
    });
  });
});

describe("unindexedAudioBytes", () => {
  it("counts audio that has no index entry yet and ignores indexed audio", async () => {
    await seedLocal("indexed");
    const early = createAudioFile("early.wav");
    await saveProjectAudio("fresh", early);
    expect(await unindexedAudioBytes()).toBe(early.size);
  });

  describe("edge cases", () => {
    it("is zero when every blob is indexed", async () => {
      await seedLocal("indexed");
      expect(await unindexedAudioBytes()).toBe(0);
    });
  });
});

describe("media signals", () => {
  it("saving audio signals media stored", async () => {
    await seedStoredProject("a");
    const { seen, stop } = recordSignals();
    await saveProjectAudio("a", createAudioFile("a.wav"));
    stop();
    expect(seen).toEqual(["media-stored"]);
  });

  it("a record saved with audio signals media stored, and without audio does not", async () => {
    const { seen, stop } = recordSignals();
    await saveProjectRecordWithAudio("a", storedProject(), createAudioFile("a.wav"));
    await saveProjectRecordWithAudio("b", storedProject(), undefined);
    stop();
    expect(seen).toEqual(["media-stored"]);
  });
});
