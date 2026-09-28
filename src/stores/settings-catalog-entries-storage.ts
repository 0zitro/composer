import type { SettingEntry } from "@/stores/settings-catalog";
import { keepYouTubeAudioDescription } from "@/ui/settings/storage/storage-options";

// -- Catalog -------------------------------------------------------------------

const STORAGE_CATALOG_ENTRIES = {
  storageUsage: {
    section: "storage",
    label: "Storage usage",
    description: "How much space Composer is using on this device, broken down by category.",
    keywords: ["space", "disk", "quota", "local audio", "youtube audio", "stems", "lyrics", "free"],
    group: "Usage",
  },
  storageProtection: {
    section: "storage",
    label: "Storage protection",
    description: "Ask the browser not to clear Composer's data when disk space runs low.",
    keywords: ["persist", "persisted", "protect", "cleanup", "browser"],
    group: "Usage",
  },
  keepYouTubeAudio: {
    section: "storage",
    label: "Keep YouTube audio",
    description: keepYouTubeAudioDescription("auto", false),
    keywords: ["youtube", "cache"],
    settingKey: "keepYouTubeAudio",
    group: "Audio",
    describe: (state) => keepYouTubeAudioDescription(state.keepYouTubeAudio, state.experiments.youtubeBridge),
  },
  smartCleanup: {
    section: "storage",
    label: "Smart cleanup",
    description:
      "When space runs low or you pass the limit, remove vocal stems first, then YouTube audio you haven't opened in a while. Local files and the open project are never removed.",
    keywords: ["cleanup", "space"],
    settingKey: "smartCleanup",
    group: "Audio",
  },
  storageLimit: {
    section: "storage",
    label: "Storage limit",
    description: "Cleanup starts above this size.",
    keywords: ["limit", "quota"],
    settingKey: "storageLimit",
    group: "Audio",
    visibleWhen: (state) => state.smartCleanup,
  },
  autoSaveDelay: {
    section: "storage",
    label: "Auto-save delay",
    description: "How long to wait after your last edit before auto-saving.",
    settingKey: "autoSaveDelay",
  },
} as const satisfies Record<string, SettingEntry>;

// -- Exports -------------------------------------------------------------------

export { STORAGE_CATALOG_ENTRIES };
