import { readYouTubeParam } from "@/utils/youtube-link-params";

// -- Types --------------------------------------------------------------------

interface LinkLocation {
  search: string;
  hash: string;
}

// -- Constants ----------------------------------------------------------------

const SONG_QUERY_PARAM_NAMES = ["title", "artist", "album", "duration", "isrc"] as const;
const IMPORT_HASH_PREFIX = "#import=";

// -- Detection ----------------------------------------------------------------

function hasIncomingLink({ search, hash }: LinkLocation): boolean {
  if (hash.startsWith(IMPORT_HASH_PREFIX)) return true;
  const params = new URLSearchParams(search);
  if (readYouTubeParam(params) !== null) return true;
  return SONG_QUERY_PARAM_NAMES.some((name) => (params.get(name)?.trim() ?? "") !== "");
}

// -- Exports ------------------------------------------------------------------

export { SONG_QUERY_PARAM_NAMES, IMPORT_HASH_PREFIX, hasIncomingLink };
