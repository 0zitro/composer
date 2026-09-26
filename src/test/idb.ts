import { PROJECT_STORE_NAME, setInStore } from "@/lib/persistence-idb";
import { LEGACY_AUDIO_KEY, LEGACY_PROJECT_KEY } from "@/lib/project-storage";

// -- Types ---------------------------------------------------------------------

interface SeedAudioFileArgs {
  name: string;
  type: string;
  data: ArrayBuffer;
}

// -- Helpers -------------------------------------------------------------------

function seedProject(project: unknown): Promise<void> {
  return setInStore(PROJECT_STORE_NAME, LEGACY_PROJECT_KEY, project);
}

function seedAudioFile(args: SeedAudioFileArgs): Promise<void> {
  return setInStore(PROJECT_STORE_NAME, LEGACY_AUDIO_KEY, args);
}

// -- Exports -------------------------------------------------------------------

export { seedProject, seedAudioFile };
