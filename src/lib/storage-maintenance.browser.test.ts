import { listStemJobs, putStem } from "@/audio/separation/stem-store";
import { NOTHING_CLEANED, type CleanupResult } from "@/lib/storage-cleanup";
import { type MaintenanceTrigger, createStorageMaintenance } from "@/lib/storage-maintenance";
import { sleep } from "@/test/async";
import { allowConsole } from "@/test/console-guard";
import { afterEach, describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

const disposers: (() => void)[] = [];

function maintenance(limitBytes: number | undefined) {
  const runs: { result: CleanupResult; trigger: MaintenanceTrigger }[] = [];
  const controller = createStorageMaintenance({
    readContext: () => ({ smartCleanup: true, limitBytes, openStemJobKey: null }),
    onCleaned: (result, trigger) => runs.push({ result, trigger }),
    delayMs: 20,
  });
  disposers.push(controller.dispose);
  return { controller, runs };
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
});

// -- Tests --------------------------------------------------------------------

describe("createStorageMaintenance", () => {
  it("coalesces scheduled checks into one run", async () => {
    const { controller, runs } = maintenance(undefined);
    controller.schedule();
    controller.schedule();
    controller.schedule();
    await expect.poll(() => runs.length).toBe(1);
    await sleep(60);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.trigger).toBe("scheduled");
  });

  it("checks at once after a quota error", async () => {
    await putStem("h1", "vocals", "fp32", new Blob([new Uint8Array(8)]));
    const { controller, runs } = maintenance(undefined);
    const result = await controller.checkNow("storage-full");
    expect(result.removedStemJobs).toBe(1);
    expect(runs.map((run) => run.trigger)).toEqual(["storage-full"]);
    expect(await listStemJobs()).toEqual([]);
  });

  it("two checks at once never remove the same stems twice", async () => {
    await putStem("h1", "vocals", "fp32", new Blob([new Uint8Array(8)]));
    const { controller } = maintenance(0);
    const [first, second] = await Promise.all([controller.checkNow("scheduled"), controller.checkNow("scheduled")]);
    expect(first.removedStemJobs + second.removedStemJobs).toBe(1);
  });

  it("still reports the result if the cleanup itself throws on a quota error", async () => {
    allowConsole(/smart cleanup failed/);
    const runs: { result: CleanupResult; trigger: MaintenanceTrigger }[] = [];
    const controller = createStorageMaintenance({
      readContext: () => {
        throw new Error("boom");
      },
      onCleaned: (result, trigger) => runs.push({ result, trigger }),
      delayMs: 20,
    });
    disposers.push(controller.dispose);
    const result = await controller.checkNow("storage-full");
    expect(result).toEqual(NOTHING_CLEANED);
    expect(runs).toEqual([{ result: NOTHING_CLEANED, trigger: "storage-full" }]);
  });

  describe("edge cases", () => {
    it("a disposed scheduler never runs its pending check", async () => {
      const { controller, runs } = maintenance(undefined);
      controller.schedule();
      controller.dispose();
      await sleep(60);
      expect(runs).toEqual([]);
    });
  });
});
