import { DEFAULT_AGENTS } from "@/domain/agent/colors";
import type { ProjectSaveArgs } from "@/lib/persistence";
import { saveProjectAudio, saveProjectRecord, setOpenProjectId } from "@/lib/project-repository";
import { SAVED_PROJECT_VERSION, type SavedProject } from "@/lib/saved-project";
import { DEFAULT_SYLLABLE_SPLIT_DEFAULTS } from "@/stores/project/types";
import { createLine } from "@/test/factories";

// -- Types --------------------------------------------------------------------

interface SeedOptions {
  project?: Partial<SavedProject>;
  audio?: File;
  open?: boolean;
}

// -- Fixtures -----------------------------------------------------------------

function storedProject(overrides: Partial<SavedProject> = {}): SavedProject {
  return {
    version: SAVED_PROJECT_VERSION,
    savedAt: 1_758_900_000_000,
    metadata: { title: "Midnight City", artists: ["M83"], album: "Hurry Up, We're Dreaming", duration: 243 },
    agents: DEFAULT_AGENTS,
    lines: [createLine({ text: "Waiting in a car", begin: 1, end: 2 }), createLine({ text: "Waiting for a ride" })],
    granularity: "word",
    primingStripped: true,
    ...overrides,
  };
}

function songTitled(title: string): Pick<SavedProject, "metadata"> {
  return { metadata: { title, artists: [], album: "", duration: 0 } };
}

function saveArgsTitled(title: string): ProjectSaveArgs {
  return [
    { title, artists: [], album: "", duration: 0 },
    DEFAULT_AGENTS,
    [createLine({ text: `${title} line` })],
    [],
    "word",
    DEFAULT_SYLLABLE_SPLIT_DEFAULTS,
    undefined,
    [],
    [],
    "original",
    true,
    [],
    false,
  ];
}

// -- Seeding ------------------------------------------------------------------

async function seedStoredProject(id: string, options: SeedOptions = {}): Promise<SavedProject> {
  const project = storedProject(options.project);
  await saveProjectRecord(id, project);
  if (options.audio) await saveProjectAudio(id, options.audio);
  if (options.open) await setOpenProjectId(id);
  return project;
}

// -- Exports ------------------------------------------------------------------

export { storedProject, songTitled, saveArgsTitled, seedStoredProject };
export type { SeedOptions };
