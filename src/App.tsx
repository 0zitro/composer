import { AudioEngine } from "@/audio/audio-engine";
import { useAutoSeparate } from "@/hooks/useAutoSeparate";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { useImportFromHash } from "@/hooks/useImportFromHash";
import { useImportFromQuery } from "@/hooks/useImportFromQuery";
import { useImportFromYouTube } from "@/hooks/useImportFromYouTube";
import { usePanicRecovery } from "@/hooks/usePanicRecovery";
import { usePersistence } from "@/hooks/usePersistence";
import { useProjectChannel } from "@/hooks/useProjectChannel";
import { useProjectShortcuts } from "@/hooks/useProjectShortcuts";
import { useResolveYouTubeTunnel } from "@/hooks/useResolveYouTubeTunnel";
import { useVocalOnsetSnapPoints } from "@/hooks/useVocalOnsetSnapPoints";
import { appQueryClient } from "@/lib/app-query-client";
import { wireFrameLoop } from "@/lib/frame-loop-wiring";
import { useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { useUIStore } from "@/stores/ui";
import { GuideCard } from "@/tour/guide-card";
import { TOUR_RESUME_KEY, TOUR_SEEN_KEY, useTour } from "@/tour/use-tour";
import "@/tour/tour-theme.css";
import { AppHeader } from "@/ui/app-header";
import { ConfirmModalHost } from "@/ui/confirm-modal";
import { DivergenceModalHost } from "@/ui/divergence-modal";
import { HelpModal } from "@/ui/help-modal";
import { ImportConflictModalHost } from "@/ui/projects/import-conflict-modal";
import { SettingsModal } from "@/ui/settings-modal";
import { EDITOR_PATH, screenForPath } from "@/utils/app-routes";
import { EditorScreen } from "@/views/editor-screen";
import { LibraryScreen } from "@/views/library/library-screen";
import { LyricsImportModalHost } from "@/views/lyrics-import-modal/lyrics-import-modal-host";
import { QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion, domAnimation } from "motion/react";
import { Activity, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";

// -- Constants ----------------------------------------------------------------

const TOUR_START_DELAY_MS = 500;

// -- Shell --------------------------------------------------------------------

const AppShell: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const screen = screenForPath(pathname);
  const isEditor = screen === "editor";
  const setActiveTab = useProjectStore((s) => s.setActiveTab);
  const source = useAudioStore((s) => s.source);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSection, setHelpSection] = useState<string | undefined>(undefined);
  const [tourRequested, setTourRequested] = useState(false);
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const openSettings = useUIStore((s) => s.openSettings);
  const closeSettings = useUIStore((s) => s.closeSettings);
  const openHelp = useCallback((section?: string) => {
    setHelpSection(section);
    setHelpOpen(true);
  }, []);
  const openBestPractices = useCallback(() => openHelp("best-practices"), [openHelp]);
  const { startTour, resumeOrStartTour, shouldShowTour, guideCard, skipGuideCard } = useTour({
    onOpenBestPractices: openBestPractices,
  });
  const startTourRef = useRef(startTour);
  startTourRef.current = startTour;
  const resumeTourRef = useRef(resumeOrStartTour);
  resumeTourRef.current = resumeOrStartTour;

  useEffect(() => {
    if (!isEditor || (!shouldShowTour && !tourRequested)) return;
    const timer = setTimeout(() => {
      if (!tourRequested) {
        startTourRef.current();
        return;
      }
      setTourRequested(false);
      resumeTourRef.current();
    }, TOUR_START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isEditor, shouldShowTour, tourRequested]);

  useEffect(() => wireFrameLoop(), []);

  useEffect(() => {
    if (!isEditor) useAudioStore.getState().setIsPlaying(false);
  }, [isEditor]);

  usePersistence();
  useProjectChannel();
  useProjectShortcuts(isEditor);
  useImportFromHash();
  useResolveYouTubeTunnel();
  useImportFromQuery();
  useImportFromYouTube();
  usePanicRecovery();
  useAutoSeparate();
  useDocumentTitle(screen);
  useVocalOnsetSnapPoints();

  const setHelpOpenCb = useCallback(
    (open: boolean) => {
      if (open) openHelp();
      else setHelpOpen(false);
    },
    [openHelp],
  );
  const setSettingsOpenCb = useCallback(
    (open: boolean) => (open ? openSettings() : closeSettings()),
    [openSettings, closeSettings],
  );

  useGlobalShortcuts({
    setActiveTab,
    setHelpOpen: setHelpOpenCb,
    setSettingsOpen: setSettingsOpenCb,
    editorActive: isEditor,
  });

  const startTourFromHeader = useCallback(() => {
    if (isEditor) {
      resumeOrStartTour();
      return;
    }
    setTourRequested(true);
    navigate(EDITOR_PATH);
  }, [isEditor, resumeOrStartTour, navigate]);

  return (
    <div className="flex flex-col h-screen bg-composer-bg text-composer-text">
      <AppHeader
        screen={screen}
        onSettingsOpen={() => openSettings()}
        onHelpOpen={() => openHelp()}
        onTourStart={startTourFromHeader}
      />
      <HelpModal
        key={helpOpen ? `help-${helpSection ?? "default"}` : "help-closed"}
        isOpen={helpOpen}
        initialSection={helpSection}
        onClose={() => setHelpOpen(false)}
      />
      <SettingsModal
        key={settingsOpen ? "settings-open" : "settings-closed"}
        isOpen={settingsOpen}
        onClose={closeSettings}
        onResetTour={() => {
          localStorage.removeItem(TOUR_SEEN_KEY);
          localStorage.removeItem(TOUR_RESUME_KEY);
        }}
      />
      <Activity mode={isEditor ? "hidden" : "visible"}>
        <LibraryScreen />
      </Activity>
      <Activity mode={isEditor ? "visible" : "hidden"}>
        <EditorScreen />
      </Activity>
      {source && <AudioEngine />}
      <GuideCard state={guideCard} onSkip={skipGuideCard} />
    </div>
  );
};

// -- App ------------------------------------------------------------------------

const App: React.FC = () => {
  return (
    <QueryClientProvider client={appQueryClient}>
      <LazyMotion features={domAnimation} strict>
        <AppShell />
        <ConfirmModalHost />
        <DivergenceModalHost />
        <LyricsImportModalHost />
        <ImportConflictModalHost />
        <Toaster
          theme="dark"
          position="bottom-center"
          toastOptions={{
            style: {
              background: "var(--color-composer-bg-elevated)",
              border: "1px solid var(--color-composer-border)",
              color: "var(--color-composer-text)",
            },
          }}
        />
      </LazyMotion>
    </QueryClientProvider>
  );
};

// -- Exports ------------------------------------------------------------------

export { App };
