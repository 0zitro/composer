import type { ProjectTab } from "@/domain/project/tab";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import type { Shortcut } from "@/hooks/useKeyboardShortcuts";
import { useAudioStore } from "@/stores/audio";
import { getEffectiveBinding, useShortcutBindingsStore } from "@/stores/shortcut-bindings";
import { useMemo } from "react";

interface GlobalShortcutActions {
  setActiveTab: (tab: ProjectTab) => void;
  setHelpOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  editorActive?: boolean;
}

function useGlobalShortcuts(actions: GlobalShortcutActions): void {
  const { setActiveTab, setHelpOpen, setSettingsOpen, editorActive = true } = actions;
  const overrides = useShortcutBindingsStore((s) => s.overrides);

  // biome-ignore lint/correctness/useExhaustiveDependencies: overrides triggers recomputation when bindings change
  const shortcuts: Shortcut[] = useMemo(() => {
    const help = getEffectiveBinding("global.help");
    const settings = getEffectiveBinding("global.settings");
    const general: Shortcut[] = [
      {
        key: help.key,
        shift: help.shift,
        alt: help.alt,
        action: () => setHelpOpen(true),
        description: "Show keyboard shortcuts",
      },
      {
        key: settings.key,
        shift: settings.shift,
        alt: settings.alt,
        action: () => setSettingsOpen(true),
        description: "Open settings",
      },
    ];
    if (!editorActive) return general;

    const playPause = getEffectiveBinding("global.playPause");
    const goToImport = getEffectiveBinding("global.goToImport");
    const goToEdit = getEffectiveBinding("global.goToEdit");
    const goToLanguages = getEffectiveBinding("global.goToLanguages");
    const goToSync = getEffectiveBinding("global.goToSync");
    const goToTimeline = getEffectiveBinding("global.goToTimeline");
    const goToPreview = getEffectiveBinding("global.goToPreview");
    const goToExport = getEffectiveBinding("global.goToExport");
    return [
      { ...goToImport, action: () => setActiveTab("import"), description: "Go to Import" },
      { ...goToEdit, action: () => setActiveTab("edit"), description: "Go to Edit" },
      { ...goToLanguages, action: () => setActiveTab("languages"), description: "Go to Languages" },
      { ...goToSync, action: () => setActiveTab("sync"), description: "Go to Sync" },
      { ...goToTimeline, action: () => setActiveTab("timeline"), description: "Go to Timeline" },
      { ...goToPreview, action: () => setActiveTab("preview"), description: "Go to Preview" },
      { ...goToExport, action: () => setActiveTab("export"), description: "Go to Export" },
      {
        key: playPause.key,
        shift: playPause.shift,
        alt: playPause.alt,
        action: () => {
          const { isPlaying, setIsPlaying } = useAudioStore.getState();
          setIsPlaying(!isPlaying);
        },
        description: "Play / Pause",
      },
      ...general,
    ];
  }, [setActiveTab, setHelpOpen, setSettingsOpen, editorActive, overrides]);

  useKeyboardShortcuts(shortcuts);
}

export { useGlobalShortcuts };
