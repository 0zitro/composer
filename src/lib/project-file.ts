import type { SavedProject } from "@/lib/saved-project";

// -- Types --------------------------------------------------------------------

interface ProjectFile extends SavedProject {
  projectId?: string;
}

// -- Constants ----------------------------------------------------------------

const PROJECT_FILE_SUFFIX = ".ttml-project.json";

// -- Building -----------------------------------------------------------------

function projectFileFrom(projectId: string | undefined, project: SavedProject): ProjectFile {
  // primingStripped ships with the file: re-importing it must never re-shift already-corrected LAME priming timings.
  const { currentStem: _stem, hasUnexportedImport: _import, ...portable } = project;
  return projectId ? { ...portable, projectId } : portable;
}

function projectFileName(title: string, date: Date): string {
  return `${title || "project"}-${date.toISOString().slice(0, 10)}${PROJECT_FILE_SUFFIX}`;
}

function downloadJsonFile(value: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function downloadProjectFile(file: ProjectFile, filename = projectFileName(file.metadata.title, new Date())): void {
  downloadJsonFile(file, filename);
}

// -- Exports ------------------------------------------------------------------

export { projectFileFrom, projectFileName, downloadJsonFile, downloadProjectFile };
export type { ProjectFile };
