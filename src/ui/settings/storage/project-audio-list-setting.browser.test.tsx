import { putStem } from "@/audio/separation/stem-store";
import { adoptOpenProjectId } from "@/lib/open-project-session";
import { loadProjectAudio } from "@/lib/project-audio";
import { createAudioFile } from "@/test/audio-fixtures";
import { seedStoredProject, songTitled } from "@/test/projects";
import { render } from "@/test/render";
import { ConfirmModalHost } from "@/ui/confirm-modal";
import { ProjectAudioListSetting } from "@/ui/settings/storage/project-audio-list-setting";
import { describe, expect, it } from "vitest";

// -- Tests --------------------------------------------------------------------

describe("ProjectAudioListSetting", () => {
  it("renders nothing until the project index and the storage report resolve", async () => {
    await seedStoredProject("a", { project: songTitled("Midnight City"), audio: createAudioFile("song.wav") });
    const screen = await render(<ProjectAudioListSetting />);
    expect(screen.container.textContent).toBe("");
    await expect.element(screen.getByText("Midnight City")).toBeInTheDocument();
  });

  it("shows every project's stored audio from real IndexedDB data", async () => {
    await seedStoredProject("a", { project: songTitled("Midnight City"), audio: createAudioFile("a.wav") });
    await seedStoredProject("b", { project: songTitled("Hurry Up"), audio: createAudioFile("b.wav") });
    const screen = await render(<ProjectAudioListSetting />);
    await expect.element(screen.getByText("Midnight City")).toBeInTheDocument();
    await expect.element(screen.getByText("Hurry Up")).toBeInTheDocument();
  });

  it("disables removal for the open project", async () => {
    await seedStoredProject("a", { project: songTitled("Midnight City"), audio: createAudioFile("a.wav") });
    adoptOpenProjectId("a");
    const screen = await render(<ProjectAudioListSetting />);
    await expect
      .element(screen.getByRole("button", { name: "Close Midnight City to remove its audio" }))
      .toHaveAttribute("aria-disabled", "true");
  });

  it("removes real stored audio through the confirm flow", async () => {
    await seedStoredProject("a", { project: songTitled("Midnight City"), audio: createAudioFile("a.wav") });
    const screen = await render(
      <>
        <ProjectAudioListSetting />
        <ConfirmModalHost />
      </>,
    );
    await screen.getByRole("button", { name: "Remove audio from Midnight City" }).click();
    await screen.getByRole("button", { name: "Remove audio", exact: true }).click();
    await expect.poll(() => loadProjectAudio("a")).toBeUndefined();
    await expect.element(screen.getByText("No audio is stored on this device.")).toBeInTheDocument();
    expect(screen.getByText("Midnight City").elements()).toHaveLength(0);
  });

  describe("edge cases", () => {
    it("counts real vocal stems into the Clear vocal stems button", async () => {
      await seedStoredProject("a", { project: songTitled("Midnight City"), audio: createAudioFile("a.wav") });
      await putStem("h1", "vocals", "fp32", new Blob([new Uint8Array(8)]));
      const screen = await render(<ProjectAudioListSetting />);
      await expect.element(screen.getByRole("button", { name: "Clear vocal stems" })).toBeInTheDocument();
    });

    it("says when no audio is stored on this device", async () => {
      const screen = await render(<ProjectAudioListSetting />);
      await expect.element(screen.getByText("No audio is stored on this device.")).toBeInTheDocument();
    });
  });
});
