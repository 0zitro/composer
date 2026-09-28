import { type StorageProtection, readStorageProtection, requestStorageProtection } from "@/lib/browser-storage";
import { BROWSER_KIND, type BrowserKind } from "@/utils/platform";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";

// -- Types --------------------------------------------------------------------

interface StorageProtectionState {
  status: StorageProtection | undefined;
  protect: () => Promise<void>;
}

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[StorageProtection]";
const STORAGE_PROTECTION_QUERY_KEY = ["storage-protection"] as const;
const DECLINED_MESSAGE = "Your browser didn't allow it this time.";
const CHROMIUM_DECLINED_MESSAGE = "Your browser said no for now. Try the steps above, then ask again.";

// -- Hook ---------------------------------------------------------------------

function useStorageProtection(browser: BrowserKind = BROWSER_KIND): StorageProtectionState {
  const queryClient = useQueryClient();
  const { data, error } = useQuery({
    queryKey: STORAGE_PROTECTION_QUERY_KEY,
    queryFn: readStorageProtection,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
  });

  useEffect(() => {
    if (error) console.error(LOG_PREFIX, "could not read storage protection", error);
  }, [error]);

  const declinedMessage = browser === "chromium" ? CHROMIUM_DECLINED_MESSAGE : DECLINED_MESSAGE;

  const protect = useCallback(async () => {
    try {
      const status = await requestStorageProtection();
      queryClient.setQueryData(STORAGE_PROTECTION_QUERY_KEY, status);
      if (status === "unprotected") toast(declinedMessage);
    } catch (failure) {
      console.error(LOG_PREFIX, "could not ask for storage protection", failure);
      toast.error(declinedMessage);
    }
  }, [queryClient, declinedMessage]);

  return { status: data, protect };
}

// -- Exports ------------------------------------------------------------------

export { useStorageProtection };
