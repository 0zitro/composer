import { beforeEach } from "vitest";
import { cleanup } from "vitest-browser-react/pure";
import { __resetOpenProjectForTests } from "@/lib/persistence";
import { __resetPersistenceSettledForTests } from "@/lib/persistence-settled";
import { resetAllStores } from "@/test/stores";
import { registerConsoleGuard, addGlobalAllowedConsolePattern } from "@/test/console-guard";

const COMPOSER_DBS = ["ttml-composer"];

async function deleteDB(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error(`deleteDatabase(${name}) failed`));
    req.onblocked = () => resolve();
  });
}

beforeEach(async () => {
  // Unmount first so a previous test's live subscriptions cannot race the wipe.
  await cleanup();
  await Promise.all(COMPOSER_DBS.map(deleteDB));
  __resetOpenProjectForTests();
  await resetAllStores();
  __resetPersistenceSettledForTests();
});

addGlobalAllowedConsolePattern(/Reduced Motion enabled/);
addGlobalAllowedConsolePattern(/React Router Future Flag Warning/);
addGlobalAllowedConsolePattern(/v7_startTransition/);
registerConsoleGuard();
