import type { ProjectIndexEntry } from "@/domain/project/index-entry";
import { useHiddenProjectIds } from "@/hooks/useHiddenProjectIds";
import { subscribeProjectsDeleted } from "@/lib/project-channel";
import { subscribeProjectIndexChanges } from "@/lib/project-index-changes";
import { listProjectIndex } from "@/lib/project-repository";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

// -- Types --------------------------------------------------------------------

interface ProjectIndexState {
  entries: ProjectIndexEntry[] | undefined;
  stored: ProjectIndexEntry[] | undefined;
  error: Error | null;
  fetchedAt: number;
}

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[ProjectIndex]";
const PROJECT_INDEX_QUERY_KEY = ["project-index"] as const;

// -- Hook ---------------------------------------------------------------------

function useProjectIndex(): ProjectIndexState {
  const queryClient = useQueryClient();
  const { data, error, dataUpdatedAt } = useQuery({
    queryKey: PROJECT_INDEX_QUERY_KEY,
    queryFn: listProjectIndex,
    staleTime: 0,
    gcTime: 0,
  });
  const hidden = useHiddenProjectIds();
  const entries = useMemo(
    () => (data && hidden.size > 0 ? data.filter((entry) => !hidden.has(entry.id)) : data),
    [data, hidden],
  );

  useEffect(() => {
    if (error) console.error(LOG_PREFIX, "could not load the project index", error);
  }, [error]);

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: PROJECT_INDEX_QUERY_KEY });
    };
    const stopLocal = subscribeProjectIndexChanges(refresh);
    const stopRemote = subscribeProjectsDeleted(refresh);
    return () => {
      stopLocal();
      stopRemote();
    };
  }, [queryClient]);

  return { entries, stored: data, error, fetchedAt: dataUpdatedAt };
}

// -- Exports ------------------------------------------------------------------

export { useProjectIndex };
export type { ProjectIndexState };
