import { DEFAULT_AGENTS } from "@/domain/agent/colors";
import {
  clearOpenProjectId,
  createProjectId,
  deleteProject,
  deleteProjectAudio,
  listProjectIndex,
  loadProjectAudio,
  saveProjectAudio,
  saveProjectRecord,
  setOpenProjectId,
} from "@/lib/project-repository";
import { getOpenProjectId, loadProjectRecord } from "@/lib/project-storage";
import type { SavedProject } from "@/lib/saved-project";
import { createLine } from "@/test/factories";
import { describe, expect, it } from "vitest";

function project(overrides: Partial<SavedProject> = {}): SavedProject {
  return {
    version: 1,
    savedAt: 1_758_900_000_000,
    metadata: { title: "Espresso", artists: ["Sabrina Carpenter"], album: "Short n' Sweet", duration: 175 },
    agents: DEFAULT_AGENTS,
    lines: [createLine({ text: "Now he's thinking bout me", begin: 1, end: 3 }), createLine({ text: "Every night" })],
    granularity: "word",
    audioSource: { kind: "file", name: "espresso.flac" },
    ...overrides,
  };
}

function audioFile(bytes: number, name = "espresso.flac"): File {
  return new File([new Uint8Array(bytes)], name, { type: "audio/flac" });
}

describe("project-repository", () => {
  it("createProjectId returns distinct URL-safe ids", () => {
    const ids = new Set(Array.from({ length: 50 }, createProjectId));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("saves a record and writes its index entry in the same call", async () => {
    await saveProjectRecord("p1", project());
    expect((await loadProjectRecord("p1"))?.metadata.title).toBe("Espresso");
    const [entry] = await listProjectIndex();
    expect(entry).toMatchObject({
      id: "p1",
      title: "Espresso",
      lineCount: 2,
      syncedLineCount: 1,
      audioKind: "file",
      storedAudioBytes: 0,
    });
  });

  it("saving audio records its size in the index, and later record saves keep it", async () => {
    await saveProjectRecord("p1", project());
    await saveProjectAudio("p1", audioFile(2048));
    await saveProjectRecord(
      "p1",
      project({ metadata: { title: "Espresso (Live)", artists: [], album: "", duration: 0 } }),
    );
    const [entry] = await listProjectIndex();
    expect(entry.title).toBe("Espresso (Live)");
    expect(entry.storedAudioBytes).toBe(2048);
  });

  it("round-trips audio as a File with its name and type", async () => {
    await saveProjectAudio("p1", audioFile(16));
    const file = await loadProjectAudio("p1");
    expect(file?.name).toBe("espresso.flac");
    expect(file?.type).toBe("audio/flac");
    expect(file?.size).toBe(16);
  });

  it("deleteProjectAudio removes the audio and sets the index size to zero", async () => {
    await saveProjectRecord("p1", project());
    await saveProjectAudio("p1", audioFile(64));
    await deleteProjectAudio("p1");
    expect(await loadProjectAudio("p1")).toBeUndefined();
    expect((await listProjectIndex())[0].storedAudioBytes).toBe(0);
  });

  it("deleteProject removes the record, the index entry and the audio", async () => {
    await saveProjectRecord("p1", project());
    await saveProjectAudio("p1", audioFile(8));
    await deleteProject("p1");
    expect(await loadProjectRecord("p1")).toBeUndefined();
    expect(await loadProjectAudio("p1")).toBeUndefined();
    expect(await listProjectIndex()).toEqual([]);
  });

  it("stores, reads and clears the open project pointer", async () => {
    expect(await getOpenProjectId()).toBeUndefined();
    await setOpenProjectId("p9");
    expect(await getOpenProjectId()).toBe("p9");
    await clearOpenProjectId();
    expect(await getOpenProjectId()).toBeUndefined();
  });

  describe("edge cases", () => {
    it("audio saved before the first record still shows its size in the index", async () => {
      await saveProjectAudio("p1", audioFile(512));
      await saveProjectRecord("p1", project());
      expect((await listProjectIndex())[0].storedAudioBytes).toBe(512);
    });

    it("saving audio for a project with no record does not create an index entry", async () => {
      await saveProjectAudio("p1", audioFile(512));
      expect(await listProjectIndex()).toEqual([]);
    });

    it("loading a missing record or audio returns undefined", async () => {
      expect(await loadProjectRecord("missing")).toBeUndefined();
      expect(await loadProjectAudio("missing")).toBeUndefined();
    });
  });

  describe("invariants", () => {
    it("keeps one index entry per project across many saves", async () => {
      for (let i = 0; i < 5; i++) await saveProjectRecord("p1", project({ savedAt: i }));
      await saveProjectRecord("p2", project());
      expect((await listProjectIndex()).map((entry) => entry.id).toSorted()).toEqual(["p1", "p2"]);
    });

    it("the index updatedAt follows the record's savedAt", async () => {
      await saveProjectRecord("p1", project({ savedAt: 42 }));
      expect((await listProjectIndex())[0].updatedAt).toBe(42);
    });
  });
});
