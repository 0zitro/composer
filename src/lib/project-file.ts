import { SAVED_PROJECT_VERSION, type SavedProject, upgradeSavedProject } from "@/lib/saved-project";
import { DEFAULT_SYLLABLE_SPLIT_DEFAULTS } from "@/stores/project/types";

// -- Types --------------------------------------------------------------------

interface ProjectFile extends SavedProject {
  projectId?: string;
}

// -- Constants ----------------------------------------------------------------

const PROJECT_FILE_SUFFIX = ".ttml-project.json";
const PROJECT_FILE_ACCEPT = ".json,.ttml-project.json";
const SUPPORTED_VERSIONS: readonly unknown[] = [1, 2, 3];

// -- Building -----------------------------------------------------------------

function projectFileFrom(projectId: string | undefined, project: SavedProject): ProjectFile {
  const { currentStem: _stem, primingStripped: _priming, hasUnexportedImport: _import, ...portable } = project;
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

async function readProjectFile(file: File): Promise<ProjectFile> {
  const { projectId, ...project } = JSON.parse(await file.text()) as SavedProject & { projectId?: unknown };
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
