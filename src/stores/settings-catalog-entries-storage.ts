import type { SettingEntry } from "@/stores/settings-catalog";

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
  autoSaveDelay: {
    section: "storage",
    label: "Auto-save delay",
    description: "How long to wait after your last edit before auto-saving.",
    settingKey: "autoSaveDelay",
  },
} as const satisfies Record<string, SettingEntry>;

// -- Exports -------------------------------------------------------------------

export { STORAGE_CATALOG_ENTRIES };
