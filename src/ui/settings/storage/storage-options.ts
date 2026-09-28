import type { KeepYouTubeAudio } from "@/domain/storage/audio-retention";
import type { StorageLimit } from "@/domain/storage/storage-limit";

// -- Options ------------------------------------------------------------------

const KEEP_YOUTUBE_AUDIO_OPTIONS: { value: KeepYouTubeAudio; label: string }[] = [
  { value: "auto", label: "Automatic" },
  { value: "always", label: "Always" },
  { value: "never", label: "Never" },
];

const STORAGE_LIMIT_OPTIONS: { value: StorageLimit; label: string }[] = [
  { value: "1gb", label: "1 GB" },
  { value: "2gb", label: "2 GB" },
  { value: "5gb", label: "5 GB" },
  { value: "none", label: "No limit" },
];

// -- Descriptions ---------------------------------------------------------------

function keepYouTubeAudioDescription(rule: KeepYouTubeAudio, bridgeEnabled: boolean): string {
  if (rule === "never") return "YouTube audio is fetched each time you open a project.";
  if (rule === "always") return "YouTube audio is kept, so projects open offline. Cleanup can still remove it.";
  return bridgeEnabled
    ? "Composer Bridge is on, so YouTube audio is fetched when you open a project and not kept."
    : "Composer Bridge is off, so YouTube audio is kept. Fetching it again can fail.";
}

// -- Exports -------------------------------------------------------------------

export { KEEP_YOUTUBE_AUDIO_OPTIONS, STORAGE_LIMIT_OPTIONS, keepYouTubeAudioDescription };
