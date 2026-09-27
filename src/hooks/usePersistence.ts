import type { ProjectTab } from "@/domain/project/tab";
import { restoreOpenProject } from "@/lib/open-project";
import { openProjectIdSnapshot } from "@/lib/open-project-session";
import { clearAudioFile, saveAudioFile, saveCurrentProject } from "@/lib/persistence";
import { cancelPendingSave, debouncedSave, flushPendingSaveQuietly } from "@/lib/persistence-debounce";
import { markPersistenceSettled } from "@/lib/persistence-settled";
import { setProjectLastTab } from "@/lib/project-repository";
import { isRestoringProject } from "@/lib/project-restore";
import { buildSaveArgs, playableFile } from "@/lib/project-snapshot";
import { trackSave } from "@/lib/save-status";
import { useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { useSeparationStore } from "@/stores/separation";
import { useSettingsStore } from "@/stores/settings";
import { useEffect } from "react";

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[Persistence]";

// -- Helpers ------------------------------------------------------------------

function commitProjectSave(): void {
  const args = buildSaveArgs();
  if (!args) return;
  debouncedSave(...args);
}

function commitProjectSaveNow(): void {
  const args = buildSaveArgs();
  if (!args) return;
  cancelPendingSave();
  trackSave("stem", saveCurrentProject(...args)).catch((err) =>
    console.error(LOG_PREFIX, "Immediate save failed:", err),
  );
}

function rememberLastTab(tab: ProjectTab): void {
  const id = openProjectIdSnapshot();
  if (!id) return;
  setProjectLastTab(id, tab).catch((err) => console.error(`${LOG_PREFIX} could not remember the tab:`, err));
}

// -- Hook ---------------------------------------------------------------------

function usePersistence(): void {
  useEffect(() => {
    restoreOpenProject()
      .catch((err) => {
        console.error(`${LOG_PREFIX} initial load failed:`, err);
      })
      .finally(() => {
        if (import.meta.env.DEV) {
          console.log(`${LOG_PREFIX} settled`, {
            title: useProjectStore.getState().metadata.title,
            source: useAudioStore.getState().source,
          });
        }
        markPersistenceSettled();
      });
  }, []);

  useEffect(
    () =>
      useProjectStore.subscribe((state, previous) => {
        if (isRestoringProject()) return;
        if (state.activeTab !== previous.activeTab) rememberLastTab(state.activeTab);
        if (state.isDirty) commitProjectSave();
      }),
    [],
  );

  // Picking a stem is a discrete action: save it at once instead of waiting for the typing debounce.
  useEffect(
    () =>
      useSeparationStore.subscribe((state, previous) => {
        if (state.currentStem === previous.currentStem || isRestoringProject()) return;
        commitProjectSaveNow();
      }),
    [],
  );

  useEffect(() => {
    let prevSource = useAudioStore.getState().source;
    return useAudioStore.subscribe((state) => {
      if (state.source === prevSource) return;
      const previous = prevSource;
      prevSource = state.source;
      if (isRestoringProject()) return;

      const nextFile = playableFile(state.source);
      const prevFile = playableFile(previous);
      if (nextFile && nextFile !== prevFile) {
        trackSave("audio", saveAudioFile(nextFile)).catch((err) =>
          console.error(`${LOG_PREFIX} audio save failed:`, err),
        );
        return;
      }
      if (!nextFile && prevFile) {
        trackSave("audio", clearAudioFile()).catch((err) => console.error(`${LOG_PREFIX} audio clear failed:`, err));
      }
    });
  }, []);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useAudioStore.subscribe((state, prev) => {
      if (state.volume === prev.volume) return;
      if (!useSettingsStore.getState().rememberVolume) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        useSettingsStore.getState().set("lastVolume", state.volume);
      }, 500);
    });
    return () => {
      unsubscribe();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Always flush; only the leave prompt is gated on real lyrics, so audio-only reloads are not nagged.
      flushPendingSaveQuietly();
      const state = useProjectStore.getState();
      if (state.isDirty && state.lines.length > 0) {
        e.preventDefault();
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);
}

// -- Exports ------------------------------------------------------------------

export { usePersistence };
