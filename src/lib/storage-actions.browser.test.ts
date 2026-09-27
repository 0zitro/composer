import { listStemJobs, putStem, stemJobKey } from "@/audio/separation/stem-store";
import { adoptOpenProjectId } from "@/lib/open-project-session";
import { loadProjectAudio } from "@/lib/project-audio";
import { loadProjectIndexEntry } from "@/lib/project-repository";
import { clearVocalStems, clearYouTubeAudio, removeAudioFromProject } from "@/lib/storage-actions";
import { useSeparationStore } from "@/stores/separation";
import { createAudioFile } from "@/test/audio-fixtures";
import { seedStoredProject } from "@/test/projects";
import { describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

async function seed(id: string, kind: "file" | "youtube"): Promise<void> {
  await seedStoredProject(id, {
    project: { audioSource: kind === "file" ? { kind, name: `${id}.wav` } : { kind, videoId: `v-${id}` } },
    audio: createAudioFile(`${id}.${kind === "file" ? "wav" : "opus"}`),
  });
}

// -- Tests --------------------------------------------------------------------

describe("removeAudioFromProject", () => {
  it("removes a closed project's local file and keeps it a local-file project with missing audio", async () => {
    await seed("a", "file");
    await removeAudioFromProject("a");
    expect(await loadProjectAudio("a")).toBeUndefined();
    expect(await loadProjectIndexEntry("a")).toMatchObject({
      audioKind: "file",
      storedAudioBytes: 0,
      audioFileName: "a.wav",
    });
  });

  it("removes a closed project's cached YouTube audio", async () => {
    await seed("y", "youtube");
    await removeAudioFromProject("y");
    expect(await loadProjectAudio("y")).toBeUndefined();
  });

  describe("error paths", () => {
    it("refuses the open project and keeps its audio", async () => {
      await seed("a", "file");
      adoptOpenProjectId("a");
      await expect(removeAudioFromProject("a")).rejects.toThrow("close it to remove its audio");
      expect(await loadProjectAudio("a")).toBeDefined();
    });
  });
});

describe("clearYouTubeAudio", () => {
  it("clears cached YouTube audio but keeps the open project's and every local file", async () => {
    await seed("y1", "youtube");
    await seed("open", "youtube");
    await seed("f", "file");
    adoptOpenProjectId("open");
    expect((await clearYouTubeAudio()).projects).toBe(1);
    expect(await loadProjectAudio("y1")).toBeUndefined();
    expect(await loadProjectAudio("open")).toBeDefined();
    expect(await loadProjectAudio("f")).toBeDefined();
  });
});

describe("clearVocalStems", () => {
  it("clears every stem job but the open project's", async () => {
    await putStem("mine", "vocals", "fp32", new Blob([new Uint8Array(4)]));
    await putStem("other", "vocals", "fp32", new Blob([new Uint8Array(4)]));
    useSeparationStore.setState({ jobKey: stemJobKey("mine", "fp32") });
    expect((await clearVocalStems()).jobs).toBe(1);
    expect((await listStemJobs()).map((job) => job.jobKey)).toEqual([stemJobKey("mine", "fp32")]);
  });

  describe("edge cases", () => {
    it("clears everything when no project is open", async () => {
      await putStem("other", "vocals", "fp32", new Blob([new Uint8Array(4)]));
      expect((await clearVocalStems()).jobs).toBe(1);
    });
  });
});
