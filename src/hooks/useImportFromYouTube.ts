import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLoadYouTubeSource } from "@/hooks/useLoadYouTubeSource";
import { type VideoProjectOutcome, openProjectForVideo } from "@/lib/open-video-project";
import { getPersistenceSettled, getQueryImportSettled, markLinkProjectSettled } from "@/lib/persistence-settled";
import { useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { showLinkedProjectToast } from "@/utils/project-toast";
import { readYouTubeParam, stripYouTubeParams } from "@/utils/youtube-link-params";
import { extractVideoId } from "@/utils/youtube-url";

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[Boot]";

// -- Helpers ------------------------------------------------------------------

type CreatedVideoProject = Extract<VideoProjectOutcome, { kind: "created" }>;

function announceLinkedProject(outcome: CreatedVideoProject): void {
  void getQueryImportSettled().then(() => {
    showLinkedProjectToast(
      useProjectStore.getState().metadata.title,
      outcome.previousTitle,
      outcome.previousId,
      outcome.id,
    );
  });
}

function hasCachedAudioFor(videoId: string): boolean {
  const current = useAudioStore.getState().source;
  return current?.type === "youtube" && current.videoId === videoId && current.file != null;
}

// -- Hook ---------------------------------------------------------------------

function useImportFromYouTube(): void {
  const loadYouTubeSource = useLoadYouTubeSource();
  const loadRef = useRef(loadYouTubeSource);
  loadRef.current = loadYouTubeSource;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = readYouTubeParam(new URLSearchParams(window.location.search));
    if (!raw) {
      markLinkProjectSettled("none");
      return;
    }

    const videoId = extractVideoId(raw);
    stripYouTubeParams();
    if (!videoId) {
      markLinkProjectSettled("none");
      toast.error("That URL doesn't look like a valid YouTube video");
      return;
    }

    let cancelled = false;
    getPersistenceSettled()
      .then(async () => {
        if (cancelled) {
          markLinkProjectSettled("none");
          return;
        }
        const outcome = await openProjectForVideo(videoId);
        markLinkProjectSettled(outcome.kind);
        if (outcome.kind === "created") announceLinkedProject(outcome);
        if (hasCachedAudioFor(videoId)) return;
        loadRef.current(videoId).catch(() => {
          // The load error is surfaced through useAudioStore.youtubeLoadError and the tunnel toast.
        });
      })
      .catch((error: unknown) => {
        console.error(`${LOG_PREFIX} could not open the project for the link`, error);
        markLinkProjectSettled("none");
        toast.error("Couldn't open the project for that link");
      });

    return () => {
      cancelled = true;
    };
  }, []);
}

// -- Exports ------------------------------------------------------------------

export { useImportFromYouTube };
