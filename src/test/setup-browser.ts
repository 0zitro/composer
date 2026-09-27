import { forgetOpenProjectId } from "@/lib/open-project-session";
import { __resetPersistenceSettledForTests } from "@/lib/persistence-settled";
import { addGlobalAllowedConsolePattern, registerConsoleGuard } from "@/test/console-guard";
import { deleteDatabase } from "@/test/idb";
import { resetAllStores } from "@/test/stores";
import { beforeEach } from "vitest";
import { cleanup } from "vitest-browser-react/pure";

const COMPOSER_DBS = ["ttml-composer"];

beforeEach(async () => {
  // Unmount first so a previous test's live subscriptions cannot race the wipe.
  await cleanup();
  await Promise.all(COMPOSER_DBS.map(deleteDatabase));
  forgetOpenProjectId();
  await resetAllStores();
  __resetPersistenceSettledForTests();
});

addGlobalAllowedConsolePattern(/Reduced Motion enabled/);
addGlobalAllowedConsolePattern(/React Router Future Flag Warning/);
addGlobalAllowedConsolePattern(/v7_startTransition/);
registerConsoleGuard();
