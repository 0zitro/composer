import { useLoadAudioFile } from "@/hooks/useLoadAudioFile";
import { isYouTubeLoadError, useLoadYouTubeSource } from "@/hooks/useLoadYouTubeSource";
import { createProject } from "@/lib/open-project";
import { EDITOR_PATH } from "@/utils/app-routes";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

// -- Types --------------------------------------------------------------------

interface NewSongStarters {
  startWithFile: (file: File) => void;
  startWithVideo: (videoId: string) => void;
}

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[NewSong]";

// -- Hook ---------------------------------------------------------------------

function useStartNewSong(): NewSongStarters {
  const navigate = useNavigate();
  const loadAudioFile = useLoadAudioFile();
  const loadYouTubeSource = useLoadYouTubeSource();

  return useMemo(
    () => ({
      startWithFile: (file: File) => {
        createProject();
        navigate(EDITOR_PATH);
        loadAudioFile(file);
      },
      startWithVideo: (videoId: string) => {
        createProject();
        navigate(EDITOR_PATH);
        loadYouTubeSource(videoId).catch((error: unknown) => {
          if (!isYouTubeLoadError(error)) console.error(LOG_PREFIX, "could not load the video", error);
        });
      },
    }),
    [navigate, loadAudioFile, loadYouTubeSource],
  );
}

// -- Exports ------------------------------------------------------------------

export { useStartNewSong };
export type { NewSongStarters };
