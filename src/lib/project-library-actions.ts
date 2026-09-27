import { displayTitle } from "@/domain/project/display-title";
import type { ProjectIndexEntry } from "@/domain/project/index-entry";
import { openProjectIdSnapshot } from "@/lib/open-project-session";
import { schedulePendingDeletion } from "@/lib/pending-deletions";
import { flushPendingSave, saveOpenProjectNow } from "@/lib/persistence-debounce";
import { downloadProjectFile, projectFileFrom } from "@/lib/project-file";
import { loadProjectAudio } from "@/lib/project-audio";
import { createProjectId, saveProjectRecordWithAudio, updateProjectRecord } from "@/lib/project-repository";
import { loadProjectRecord } from "@/lib/project-storage";
import type { SavedProject } from "@/lib/saved-project";
import { useProjectStore } from "@/stores/project";
import { showDeletedProjectsToast } from "@/utils/project-toast";

// -- Types --------------------------------------------------------------------

type DeletableProject = Pick<ProjectIndexEntry, "id" | "title">;

// -- Helpers ------------------------------------------------------------------

async function latestRecord(id: string): Promise<SavedProject> {
  if (id === openProjectIdSnapshot()) await flushPendingSave();
  const record = await loadProjectRecord(id);
  if (!record) throw new Error(`Project ${id} is not stored in this browser`);
  return record;
}

function copyTitle(title: string): string {
  return `${displayTitle(title)} copy`;
}

// -- Actions ------------------------------------------------------------------

async function renameProject(id: string, title: string): Promise<void> {
  const nextTitle = title.trim();
  if (id === openProjectIdSnapshot()) {
    useProjectStore.getState().setMetadata({ title: nextTitle });
    await saveOpenProjectNow();
    return;
  }
  await updateProjectRecord(id, (project) => ({
    ...project,
    metadata: { ...project.metadata, title: nextTitle },
    savedAt: Date.now(),
  }));
}

async function duplicateProject(id: string): Promise<string> {
  const record = await latestRecord(id);
  const audio = await loadProjectAudio(id);
  const copyId = createProjectId();
  await saveProjectRecordWithAudio(
    copyId,
    { ...record, metadata: { ...record.metadata, title: copyTitle(record.metadata.title) }, savedAt: Date.now() },
    audio,
  );
  return copyId;
}

async function exportProjectFiles(ids: readonly string[]): Promise<void> {
  for (const id of ids) downloadProjectFile(projectFileFrom(id, await latestRecord(id)));
}

function deleteProjectsWithUndo(projects: readonly DeletableProject[]): void {
  if (projects.length === 0) return;
  const deletion = schedulePendingDeletion(projects.map((project) => project.id));
  showDeletedProjectsToast(
    projects.map((project) => project.title),
    deletion,
  );
}

// -- Exports ------------------------------------------------------------------

export { renameProject, duplicateProject, exportProjectFiles, deleteProjectsWithUndo };
export type { DeletableProject };
