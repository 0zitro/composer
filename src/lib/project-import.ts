import { type ProjectIndexEntry, buildIndexEntry } from "@/domain/project/index-entry";
import { byMostRecentlyEdited } from "@/domain/project/library-order";
import { openProject, reloadOpenProject } from "@/lib/open-project";
import { openProjectIdSnapshot } from "@/lib/open-project-session";
import { hiddenProjectIdsSnapshot } from "@/lib/pending-deletions";
import { flushPendingSave } from "@/lib/persistence-debounce";
import { type ProjectFile, readProjectFile, savedProjectFromFile } from "@/lib/project-file";
import { createProjectId, listProjectIndex, saveProjectRecord, updateProjectRecord } from "@/lib/project-repository";
import { ProjectDeletedError } from "@/lib/project-tombstones";
import { useImportConflictStore } from "@/stores/import-conflict-store";
import { toast } from "sonner";

// -- Types --------------------------------------------------------------------

type ImportConflictReason = "same-project" | "same-video";

interface ImportConflict {
  file: ProjectFile;
  existing: ProjectIndexEntry;
  reason: ImportConflictReason;
}

interface ProjectFileSummary {
  savedAt: number;
  lineCount: number;
  syncedLineCount: number;
}

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[ProjectImport]";

// -- Matching -----------------------------------------------------------------

function findImportConflict(file: ProjectFile, entries: readonly ProjectIndexEntry[]): ImportConflict | undefined {
  const sameProject = file.projectId ? entries.find((entry) => entry.id === file.projectId) : undefined;
  if (sameProject) return { file, existing: sameProject, reason: "same-project" };
  const videoId = file.audioSource?.kind === "youtube" ? file.audioSource.videoId : undefined;
  if (!videoId) return undefined;
  const sameVideo = entries.filter((entry) => entry.videoId === videoId).toSorted(byMostRecentlyEdited)[0];
  return sameVideo ? { file, existing: sameVideo, reason: "same-video" } : undefined;
}

function projectFileSummary(file: ProjectFile): ProjectFileSummary {
  const entry = buildIndexEntry({
    id: file.projectId ?? "",
    metadata: file.metadata,
    lines: file.lines,
    audioSource: file.audioSource,
    storedAudioBytes: 0,
    updatedAt: file.savedAt,
  });
  return { savedAt: file.savedAt, lineCount: entry.lineCount, syncedLineCount: entry.syncedLineCount };
}

// -- Writing ------------------------------------------------------------------

async function importProjectAsNew(file: ProjectFile): Promise<string> {
  const id = createProjectId();
  await saveProjectRecord(id, savedProjectFromFile(file, Date.now()));
  return id;
}

async function replaceProjectFromFile(id: string, file: ProjectFile): Promise<void> {
  const replacesOpenProject = id === openProjectIdSnapshot();
  if (replacesOpenProject) await flushPendingSave();
  await updateProjectRecord(id, (existing) => ({
    ...savedProjectFromFile(file, Date.now()),
    audioSource: existing.audioSource ?? file.audioSource,
    audioFileName: existing.audioFileName ?? file.audioFileName,
    currentStem: existing.currentStem,
    primingStripped: existing.primingStripped,
  }));
  if (replacesOpenProject) await reloadOpenProject();
}

async function liveEntries(): Promise<ProjectIndexEntry[]> {
  const hidden = hiddenProjectIdsSnapshot();
  return (await listProjectIndex()).filter((entry) => !hidden.has(entry.id));
}

// -- Flow ---------------------------------------------------------------------

async function importProjectFile(file: File): Promise<string | null> {
  let projectFile: ProjectFile;
  try {
    projectFile = await readProjectFile(file);
  } catch (error) {
    console.error(LOG_PREFIX, "could not read the project file", error);
    toast.error("Couldn't read that project file");
    return null;
  }
  try {
    const conflict = findImportConflict(projectFile, await liveEntries());
    const choice = conflict ? await useImportConflictStore.getState().ask(conflict) : "keep-both";
    if (choice === "cancel") return null;
    let id: string;
    if (choice === "replace" && conflict) {
      try {
        id = conflict.existing.id;
        await replaceProjectFromFile(id, projectFile);
      } catch (error) {
        if (!(error instanceof ProjectDeletedError)) throw error;
        console.warn(LOG_PREFIX, "the project to replace no longer exists; importing as a new project instead", error);
        id = await importProjectAsNew(projectFile);
      }
    } else {
      id = await importProjectAsNew(projectFile);
    }
    await openProject(id);
    return id;
  } catch (error) {
    console.error(LOG_PREFIX, "could not import the project file", error);
    toast.error("Couldn't import that project");
    return null;
  }
}

// -- Exports ------------------------------------------------------------------

export { findImportConflict, projectFileSummary, importProjectAsNew, replaceProjectFromFile, importProjectFile };
export type { ImportConflict, ImportConflictReason, ProjectFileSummary };
