import { DEFAULT_AGENTS } from "@/domain/agent/colors";
import { buildProjectBundle } from "@/lib/project-bundle";
import { readProjectFileContents } from "@/lib/project-file-read";
import { SAVED_PROJECT_VERSION, type SavedProject } from "@/lib/saved-project";
import { describe, expect, it, vi } from "vitest";

// -- Helpers ------------------------------------------------------------------

function savedProject(title: string): SavedProject {
  return {
    version: SAVED_PROJECT_VERSION,
    savedAt: 1,
    metadata: { title, artists: [], album: "", duration: 0 },
    agents: DEFAULT_AGENTS,
    lines: [],
    granularity: "word",
  };
}

function jsonFile(value: unknown): File {
  return new File([JSON.stringify(value)], "backup.ttml-projects.json");
}

// -- Tests --------------------------------------------------------------------

describe("readProjectFileContents", () => {
  it("reads a single project file", async () => {
    const contents = await readProjectFileContents(jsonFile({ ...savedProject("Alpha"), projectId: "a" }));
    expect(contents.kind).toBe("project");
    expect(contents.kind === "project" ? contents.project.projectId : null).toBe("a");
  });

  it("reads every project in a backup bundle", async () => {
    const bundle = buildProjectBundle(
      [
        { id: "a", project: savedProject("Alpha") },
        { id: "b", project: savedProject("Bravo") },
      ],
      1,
    );
    const contents = await readProjectFileContents(jsonFile(bundle));
    expect(contents.kind === "bundle" ? contents.projects.map((project) => project.metadata.title) : []).toEqual([
      "Alpha",
      "Bravo",
    ]);
  });

  describe("error paths", () => {
    it("skips unreadable projects in a bundle and counts them", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const bundle = buildProjectBundle([{ id: "a", project: savedProject("Alpha") }], 1);
      const broken = {
        ...bundle,
        projects: [...bundle.projects, { nope: true }, { ...savedProject("Old"), version: 99 }],
      };
      const contents = await readProjectFileContents(jsonFile(broken));
      expect(contents).toMatchObject({ kind: "bundle", unreadable: 2 });
      expect(contents.kind === "bundle" ? contents.projects : []).toHaveLength(1);
      expect(warn).toHaveBeenCalledTimes(2);
      warn.mockRestore();
    });

    it("rejects a file that is neither a project nor a bundle", async () => {
      await expect(readProjectFileContents(jsonFile({ hello: "world" }))).rejects.toThrow(
        "Not a Composer project file",
      );
    });

    it("rejects malformed JSON", async () => {
      await expect(readProjectFileContents(new File(["{"], "broken.json"))).rejects.toThrow();
    });
  });
});
