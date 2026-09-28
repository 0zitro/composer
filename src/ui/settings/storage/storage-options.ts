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

// -- Exports -------------------------------------------------------------------

export { KEEP_YOUTUBE_AUDIO_OPTIONS, STORAGE_LIMIT_OPTIONS };
