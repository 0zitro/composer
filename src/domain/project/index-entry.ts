import type { LyricLine } from "@/domain/line/model";
import { hasAnyTiming, hasMainLyrics, isWordSynced } from "@/domain/line/predicates";
import type { SavedAudioSource } from "@/domain/project/audio-source";
import { normalizeLoadedMetadata } from "@/domain/project/normalize-metadata";

// -- Types --------------------------------------------------------------------

type ProjectAudioKind = "none" | "file" | "youtube";

interface ProjectIndexEntry {
  id: string;
  title: string;
  artists: string[];
  album: string;
  thumbnailDataUrl?: string;
  lineCount: number;
  syncedLineCount: number;
  hasWordTiming: boolean;
  audioKind: ProjectAudioKind;
  storedAudioBytes: number;
  updatedAt: number;
}

interface IndexEntryInput {
  id: string;
  metadata: Parameters<typeof normalizeLoadedMetadata>[0];
  lines: LyricLine[] | undefined;
  audioSource: SavedAudioSource | undefined;
  storedAudioBytes: number;
  updatedAt: number;
}

// -- Derivation ---------------------------------------------------------------

function buildIndexEntry(input: IndexEntryInput): ProjectIndexEntry {
  const metadata = normalizeLoadedMetadata(input.metadata);
  const lyricLines = (input.lines ?? []).filter(hasMainLyrics);
  return {
    id: input.id,
    title: metadata.title,
    artists: metadata.artists,
    album: metadata.album,
    ...(metadata.thumbnailDataUrl ? { thumbnailDataUrl: metadata.thumbnailDataUrl } : {}),
    lineCount: lyricLines.length,
    syncedLineCount: lyricLines.filter(hasAnyTiming).length,
    hasWordTiming: lyricLines.some(isWordSynced),
    audioKind: input.audioSource?.kind ?? "none",
    storedAudioBytes: input.storedAudioBytes,
    updatedAt: input.updatedAt,
  };
}

// -- Exports ------------------------------------------------------------------

export { buildIndexEntry };
export type { IndexEntryInput, ProjectAudioKind, ProjectIndexEntry };
