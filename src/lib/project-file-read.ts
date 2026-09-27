import { DEFAULT_SYLLABLE_SPLIT_DEFAULTS } from "@/domain/project/syllable-split-defaults";
import type { ProjectFile } from "@/lib/project-file";
import { SAVED_PROJECT_VERSION, type SavedProject, upgradeSavedProject } from "@/lib/saved-project";

// -- Constants ----------------------------------------------------------------

const PROJECT_FILE_ACCEPT = ".json,.ttml-project.json";
const SUPPORTED_VERSIONS: readonly number[] = Array.from({ length: SAVED_PROJECT_VERSION }, (_, index) => index + 1);

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

export { PROJECT_FILE_ACCEPT, readProjectFile, savedProjectFromFile };
