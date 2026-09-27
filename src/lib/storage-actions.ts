import { type StemRemoval, clearStemCache } from "@/audio/separation/stem-store";
import { isProjectInUse, openProjectIdSnapshot } from "@/lib/open-project-session";
import { type AudioRemoval, clearCachedYouTubeAudio, deleteProjectAudio } from "@/lib/project-audio";
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

// -- Exports ------------------------------------------------------------------

export { removeAudioFromProject, clearYouTubeAudio, clearVocalStems };
