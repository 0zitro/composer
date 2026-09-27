import { type StemRemoval, clearStemCache } from "@/audio/separation/stem-store";
import { isProjectInUse, openProjectIdSnapshot } from "@/lib/open-project-session";
import { hiddenProjectIdsSnapshot } from "@/lib/pending-deletions";
import { flushPendingSave } from "@/lib/persistence-debounce";
import { type AudioRemoval, clearCachedYouTubeAudio, deleteProjectAudio } from "@/lib/project-audio";
import { type ProjectBundle, buildProjectBundle, downloadProjectBundle } from "@/lib/project-bundle";
import { listProjectRecords } from "@/lib/project-storage";
import { useSeparationStore } from "@/stores/separation";

// -- Actions ------------------------------------------------------------------

async function removeAudioFromProject(id: string): Promise<void> {
  if (isProjectInUse(id)) throw new Error(`Project ${id} is open; close it to remove its audio`);
  await deleteProjectAudio(id);
}

function clearYouTubeAudio(): Promise<AudioRemoval> {
  return clearCachedYouTubeAudio(openProjectIdSnapshot());
}

function clearVocalStems(): Promise<StemRemoval> {
  return clearStemCache(useSeparationStore.getState().jobKey);
}

async function backUpAllProjects(): Promise<ProjectBundle | null> {
  if (openProjectIdSnapshot()) await flushPendingSave();
  const hidden = hiddenProjectIdsSnapshot();
  const records = (await listProjectRecords()).filter((record) => !hidden.has(record.id));
  if (records.length === 0) return null;
  const bundle = buildProjectBundle(records, Date.now());
  downloadProjectBundle(bundle);
  return bundle;
}

// -- Exports ------------------------------------------------------------------

export { removeAudioFromProject, clearYouTubeAudio, clearVocalStems, backUpAllProjects };
