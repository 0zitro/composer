import { hasLyricLines } from "@/domain/project/lyrics-presence";
import { createProject, openProject } from "@/lib/open-project";
import { openProjectIdSnapshot } from "@/lib/open-project-session";
import { findProjectByVideoId } from "@/lib/project-repository";
import { useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { isYouTubeSourceFor } from "@/utils/youtube-source";

// -- Types --------------------------------------------------------------------

type VideoProjectOutcome =
  | { kind: "current" }
  | { kind: "reopened"; id: string }
  | { kind: "created"; id: string; previousId: string; previousTitle: string };

// -- Public API ---------------------------------------------------------------

async function openProjectForVideo(videoId: string): Promise<VideoProjectOutcome> {
  const openId = openProjectIdSnapshot();
  if (isYouTubeSourceFor(useAudioStore.getState().source, videoId)) {
    return openId ? { kind: "reopened", id: openId } : { kind: "current" };
  }

  const match = await findProjectByVideoId(videoId);
  if (match) {
    if (match.id !== openId) await openProject(match.id);
    return { kind: "reopened", id: match.id };
  }

  const { lines, metadata } = useProjectStore.getState();
  if (!openId || !hasLyricLines(lines)) return { kind: "current" };
  const previousTitle = metadata.title;
  return { kind: "created", id: createProject(), previousId: openId, previousTitle };
}

// -- Exports ------------------------------------------------------------------

export { openProjectForVideo };
export type { VideoProjectOutcome };
