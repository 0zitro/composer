import { useLoadAudioFile } from "@/hooks/useLoadAudioFile";
import { usePersistence } from "@/hooks/usePersistence";
import { ensureOpenProjectId, openProjectIdSnapshot } from "@/lib/open-project-session";
import { getPersistenceSettled } from "@/lib/persistence-settled";
import { loadProjectAudio } from "@/lib/project-repository";
import { loadProjectRecord } from "@/lib/project-storage";
import { useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { createAudioFile } from "@/test/audio-fixtures";
import { createLine } from "@/test/factories";
import { render } from "@/test/render";
import { seedStoredProject, songTitled } from "@/test/projects";
import { Toaster } from "sonner";
import { describe, expect, it } from "vitest";
import { type RenderResult, renderHook } from "vitest-browser-react";

// -- Types --------------------------------------------------------------------

interface OpenedAlpha {
  screen: RenderResult;
  current: File | undefined;
}

// -- Helpers ------------------------------------------------------------------

const PersistenceHost: React.FC = () => {
  usePersistence();
  return <Toaster />;
};

async function openAlpha(options: { lyrics: boolean; audio: boolean }): Promise<OpenedAlpha> {
  const audio = options.audio ? createAudioFile("alpha.wav") : undefined;
  await seedStoredProject("a", {
    open: true,
    audio,
    project: {
      ...songTitled("Alpha"),
      ...(options.lyrics ? {} : { lines: [] }),
      ...(audio ? { audioSource: { kind: "file" as const, name: "alpha.wav" } } : {}),
    },
  });
  const screen = await render(<PersistenceHost />);
  await getPersistenceSettled();
  const source = useAudioStore.getState().source;
  return { screen, current: source?.type === "file" ? source.file : undefined };
}

async function loader(): Promise<(file: File) => void> {
  const { result } = await renderHook(() => useLoadAudioFile());
  return result.current;
}

// -- Tests --------------------------------------------------------------------

describe("useLoadAudioFile · projects", () => {
  it("a different song over a project with lyrics opens a new project and keeps the old one", async () => {
    await openAlpha({ lyrics: true, audio: true });
    const load = await loader();
    load(createAudioFile("b-side.wav"));
    expect(openProjectIdSnapshot()).not.toBe("a");
    expect(useProjectStore.getState().lines).toEqual([]);
    expect(useProjectStore.getState().metadata.title).toBe("b-side");
    expect((await loadProjectRecord("a"))?.lines).toHaveLength(2);
  });

  it("shows a toast that switches back to the previous project", async () => {
    const { screen } = await openAlpha({ lyrics: true, audio: true });
    const load = await loader();
    load(createAudioFile("b-side.wav"));
    await expect.element(screen.getByText("Opened “b-side” in a new project")).toBeInTheDocument();
    await expect.element(screen.getByText("“Alpha” is still in Projects.")).toBeInTheDocument();
    await screen.getByRole("button", { name: "Switch back" }).click();
    await expect.poll(openProjectIdSnapshot).toBe("a");
    expect(useProjectStore.getState().metadata.title).toBe("Alpha");
  });

  it("saves the new song's audio into the new project only", async () => {
    await openAlpha({ lyrics: true, audio: true });
    const load = await loader();
    load(createAudioFile("b-side.wav"));
    const id = openProjectIdSnapshot() ?? "";
    await expect.poll(async () => (await loadProjectAudio(id))?.name).toBe("b-side.wav");
    expect((await loadProjectAudio("a"))?.name).toBe("alpha.wav");
  });

  describe("edge cases", () => {
    it("a different song over a project without lyrics replaces it in place", async () => {
      await openAlpha({ lyrics: false, audio: true });
      const load = await loader();
      load(createAudioFile("b-side.wav"));
      expect(openProjectIdSnapshot()).toBe("a");
      expect(useProjectStore.getState().metadata.title).toBe("b-side");
    });

    it("dropping the same file again keeps the project", async () => {
      const { current } = await openAlpha({ lyrics: true, audio: true });
      if (!current) throw new Error("expected restored audio");
      const load = await loader();
      load(current);
      expect(openProjectIdSnapshot()).toBe("a");
      expect(useProjectStore.getState().lines).toHaveLength(2);
    });

    it("the first audio for a project with lyrics attaches to it", async () => {
      await openAlpha({ lyrics: true, audio: false });
      const load = await loader();
      load(createAudioFile("b-side.wav"));
      expect(openProjectIdSnapshot()).toBe("a");
      expect(useProjectStore.getState().lines).toHaveLength(2);
    });

    it("shows the new-project toast even when the previous project has no id yet", async () => {
      const screen = await render(<Toaster />);
      useAudioStore.getState().setSource({ type: "file", file: createAudioFile("alpha.wav") });
      useProjectStore.getState().setLines([createLine({ text: "Waiting in a car" })]);
      useProjectStore.getState().setMetadata({ title: "Alpha" });
      expect(openProjectIdSnapshot()).toBeUndefined();
      const load = await loader();
      load(createAudioFile("b-side.wav"));
      const previousId = await ensureOpenProjectId();
      expect(previousId).not.toBe(openProjectIdSnapshot());
      await expect.element(screen.getByText("Opened “b-side” in a new project")).toBeInTheDocument();
      await expect.element(screen.getByText("“Alpha” is still in Projects.")).toBeInTheDocument();
    });
  });
});
