import { SAVED_PROJECT_VERSION, type SavedProject, upgradeSavedProject } from "@/lib/saved-project";
import { DEFAULT_SYLLABLE_SPLIT_DEFAULTS } from "@/stores/project/types";

// -- Types --------------------------------------------------------------------

interface ProjectFile extends SavedProject {
  projectId?: string;
}

// -- Constants ----------------------------------------------------------------

const PROJECT_FILE_SUFFIX = ".ttml-project.json";
const PROJECT_FILE_ACCEPT = ".json,.ttml-project.json";
const SUPPORTED_VERSIONS: readonly number[] = Array.from({ length: SAVED_PROJECT_VERSION }, (_, index) => index + 1);

// -- Building -----------------------------------------------------------------

function projectFileFrom(projectId: string | undefined, project: SavedProject): ProjectFile {
  // primingStripped ships with the file: re-importing it must never re-shift already-corrected LAME priming timings.
  const { currentStem: _stem, hasUnexportedImport: _import, ...portable } = project;
  return projectId ? { ...portable, projectId } : portable;
}

function projectFileName(title: string, date: Date): string {
  return `${title || "project"}-${date.toISOString().slice(0, 10)}${PROJECT_FILE_SUFFIX}`;
}

function downloadProjectFile(file: ProjectFile): void {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = projectFileName(file.metadata.title, new Date());
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// -- Reading ------------------------------------------------------------------

function isProjectFilePayload(value: unknown): value is SavedProject & { projectId?: unknown } {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value) && "lines" in value && "metadata" in value
  );
}

async function readProjectFile(file: File): Promise<ProjectFile> {
  const parsed: unknown = JSON.parse(await file.text());
  if (!isProjectFilePayload(parsed)) throw new Error("Not a Composer project file");
  const { projectId, ...project } = parsed;
  if (!SUPPORTED_VERSIONS.includes(project.version)) {
    throw new Error(`Unsupported project version: ${project.version}`);
  }
  if (!project.syllableSplitDefaults) project.syllableSplitDefaults = DEFAULT_SYLLABLE_SPLIT_DEFAULTS;
  upgradeSavedProject(project);
  return typeof projectId === "string" && projectId !== "" ? { ...project, projectId } : project;
}

function savedProjectFromFile(file: ProjectFile, savedAt: number): SavedProject {
  const { projectId: _projectId, ...project } = file;
  return { ...project, version: SAVED_PROJECT_VERSION, savedAt, hasUnexportedImport: true };
}

// -- Exports ------------------------------------------------------------------

export {
  PROJECT_FILE_ACCEPT,
  projectFileFrom,
  projectFileName,
  downloadProjectFile,
  readProjectFile,
  savedProjectFromFile,
};
export type { ProjectFile };
