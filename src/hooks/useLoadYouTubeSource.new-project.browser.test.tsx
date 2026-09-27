import { useLoadYouTubeSource } from "@/hooks/useLoadYouTubeSource";
import { restoreOpenProject } from "@/lib/open-project";
import { openProjectIdSnapshot } from "@/lib/open-project-session";
import { isProjectDeleted } from "@/lib/project-tombstones";
import { useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { createAudioFile } from "@/test/audio-fixtures";
import { render } from "@/test/render";
import { seedStoredProject, songTitled } from "@/test/projects";
import { Toaster } from "sonner";
import { describe, expect, it } from "vitest";
import { renderHook } from "vitest-browser-react";

// -- Constants ----------------------------------------------------------------

const VIDEO_ID = "dQw4w9WgXcQ";
const OTHER_VIDEO_ID = "9bZkp7q19f0";

// -- Helpers ------------------------------------------------------------------

async function openAlpha(lyrics: boolean): Promise<void> {
  await seedStoredProject("a", {
    open: true,
    audio: createAudioFile("alpha.wav"),
    project: {
      ...songTitled("Alpha"),
      ...(lyrics ? {} : { lines: [] }),
      audioSource: { kind: "file", name: "alpha.wav" },
    },
  });
  await restoreOpenProject();
}

async function loader(): Promise<(videoId: string) => Promise<void>> {
  const { result } = await renderHook(() => useLoadYouTubeSource());
  return result.current;
}

function videoFile(videoId: string): File {
  return new File([new Uint8Array([1, 2, 3])], `${videoId}.opus`, { type: "audio/ogg" });
}

// -- Tests --------------------------------------------------------------------

describe("useLoadYouTubeSource · projects", () => {
  it("a different video over a project with lyrics opens a new project", async () => {
    const screen = await render(<Toaster />);
    await openAlpha(true);
    const load = await loader();
    const loading = load(VIDEO_ID);
    const id = openProjectIdSnapshot();
    expect(id).not.toBe("a");
    expect(useProjectStore.getState().lines).toEqual([]);
    expect(useProjectStore.getState().metadata.title).toBe(VIDEO_ID);
    useAudioStore.getState().setYouTubeFile(videoFile(VIDEO_ID));
    await expect(loading).resolves.toBeUndefined();
    await expect.element(screen.getByText(`Opened “${VIDEO_ID}” in a new project`)).toBeInTheDocument();
    await expect.element(screen.getByText("“Alpha” is still in Projects.")).toBeInTheDocument();
  });

  it("a failed load returns to the previous project and removes the empty new one", async () => {
    await openAlpha(true);
    const load = await loader();
    const loading = load(VIDEO_ID);
    const id = openProjectIdSnapshot() ?? "";
    useAudioStore.getState().setYouTubeLoadError("Could not load that video. Try again.");
    await expect(loading).rejects.toThrow("Could not load that video. Try again.");
    expect(openProjectIdSnapshot()).toBe("a");
    expect(useProjectStore.getState().metadata.title).toBe("Alpha");
    expect(await isProjectDeleted(id)).toBe(true);
  });

  describe("edge cases", () => {
    it("a load superseded by another video stays in the new project", async () => {
      await openAlpha(true);
      const load = await loader();
      const loading = load(VIDEO_ID);
      const id = openProjectIdSnapshot();
      useAudioStore.getState().setYouTubeSource(OTHER_VIDEO_ID);
      await expect(loading).rejects.toThrow("youtube_load_superseded");
      expect(openProjectIdSnapshot()).toBe(id);
    });

    it("a failed load keeps the new project once lyrics were typed into it", async () => {
      await openAlpha(true);
      const load = await loader();
      const loading = load(VIDEO_ID);
      const id = openProjectIdSnapshot();
      useProjectStore.getState().setLines([{ id: "n1", text: "New words", agentId: "v1" }]);
      useAudioStore.getState().setYouTubeLoadError("Could not load that video. Try again.");
      await expect(loading).rejects.toThrow();
      expect(openProjectIdSnapshot()).toBe(id);
    });

    it("a different video over a project without lyrics replaces it in place", async () => {
      await openAlpha(false);
      const load = await loader();
      void load(VIDEO_ID).catch(() => undefined);
      expect(openProjectIdSnapshot()).toBe("a");
      expect(useProjectStore.getState().metadata.title).toBe(VIDEO_ID);
    });
  });
});
