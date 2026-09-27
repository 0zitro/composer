import { forgetOpenProjectId } from "@/lib/open-project-session";
import { __resetPendingDeletionsForTests } from "@/lib/pending-deletions";
import { __resetPersistenceSettledForTests } from "@/lib/persistence-settled";
import { resetSaveStatus } from "@/lib/save-status";
import { addGlobalAllowedConsolePattern, registerConsoleGuard } from "@/test/console-guard";
import { deleteDatabase } from "@/test/idb";
import { resetAllStores } from "@/test/stores";
import { toast } from "sonner";
import { beforeEach } from "vitest";
import { cleanup } from "vitest-browser-react/pure";

const COMPOSER_DBS = ["ttml-composer"];

beforeEach(async () => {
  // Unmount first so a previous test's live subscriptions cannot race the wipe.
  await cleanup();
  await Promise.all(COMPOSER_DBS.map(deleteDatabase));
  forgetOpenProjectId();
  __resetPendingDeletionsForTests();
  await resetAllStores();
  __resetPersistenceSettledForTests();
  resetSaveStatus();
  toast.dismiss();
});

addGlobalAllowedConsolePattern(/Reduced Motion enabled/);
addGlobalAllowedConsolePattern(/React Router Future Flag Warning/);
addGlobalAllowedConsolePattern(/v7_startTransition/);
registerConsoleGuard();
