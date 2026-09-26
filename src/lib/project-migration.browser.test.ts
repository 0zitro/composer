import { describe, expect, it } from "vitest";
import { PROJECT_STORE_NAME, getFromStore } from "@/lib/persistence-idb";
import { migrateLegacyProject } from "@/lib/project-migration";
import { getOpenProjectId, listProjectIndex, loadProjectAudio, loadProjectRecord } from "@/lib/project-repository";
import { seedAudioFile, seedProject } from "@/test/idb";

const LEGACY_PROJECT = {
  version: 1,
  savedAt: 1_758_000_000_000,
  metadata: { title: "Kick Back", artists: ["Kenshi Yonezu"], album: "Kick Back", duration: 193 },
  agents: [{ id: "v1", name: "Singer 1", color: "#fff" }],
  lines: [{ id: "a", text: "Doryoku mirai", agentId: "v1", begin: 1, end: 2 }],
  granularity: "word",
  audioSource: { kind: "file", name: "kick-back.flac" },
};

describe("migrateLegacyProject", () => {
  it("moves the legacy project and audio into a new open project", async () => {
    await seedProject(LEGACY_PROJECT);
    await seedAudioFile({ name: "kick-back.flac", type: "audio/flac", data: new Uint8Array(300).buffer });

    const id = await migrateLegacyProject();

    expect(id).toBeTruthy();
    expect(await getOpenProjectId()).toBe(id);
    expect((await loadProjectRecord(id as string))?.metadata.title).toBe("Kick Back");
    expect((await loadProjectAudio(id as string))?.size).toBe(300);
    expect(await listProjectIndex()).toEqual([
      expect.objectContaining({ id, title: "Kick Back", storedAudioBytes: 300, syncedLineCount: 1 }),
    ]);
  });

  it("deletes the legacy keys so the project has one home", async () => {
    await seedProject(LEGACY_PROJECT);
    await seedAudioFile({ name: "kick-back.flac", type: "audio/flac", data: new Uint8Array(4).buffer });
    await migrateLegacyProject();
    expect(await getFromStore(PROJECT_STORE_NAME, "current")).toBeUndefined();
    expect(await getFromStore(PROJECT_STORE_NAME, "current-audio")).toBeUndefined();
  });

  it("returns undefined and writes nothing when there is no legacy data", async () => {
    expect(await migrateLegacyProject()).toBeUndefined();
    expect(await getOpenProjectId()).toBeUndefined();
    expect(await listProjectIndex()).toEqual([]);
  });

  describe("edge cases", () => {
    it("migrates a legacy project that has no audio", async () => {
      await seedProject(LEGACY_PROJECT);
      const id = await migrateLegacyProject();
      expect(await loadProjectAudio(id as string)).toBeUndefined();
      expect((await listProjectIndex())[0].storedAudioBytes).toBe(0);
    });

    it("migrates legacy audio that has no project record, without an index entry", async () => {
      await seedAudioFile({ name: "demo.wav", type: "audio/wav", data: new Uint8Array(10).buffer });
      const id = await migrateLegacyProject();
      expect((await loadProjectAudio(id as string))?.name).toBe("demo.wav");
      expect(await listProjectIndex()).toEqual([]);
    });
  });

  describe("invariants", () => {
    it("is idempotent: a second run is a no-op that returns the same open id", async () => {
      await seedProject(LEGACY_PROJECT);
      const first = await migrateLegacyProject();
      const second = await migrateLegacyProject();
      expect(second).toBe(first);
      expect(await listProjectIndex()).toHaveLength(1);
    });

    it("regression: two concurrent runs create exactly one project", async () => {
      await seedProject(LEGACY_PROJECT);
      const [a, b] = await Promise.all([migrateLegacyProject(), migrateLegacyProject()]);
      expect(a).toBe(b);
      expect(await listProjectIndex()).toHaveLength(1);
    });
  });
});
