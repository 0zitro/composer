import { getSaveStatus, resetSaveStatus, setSavePending, subscribeSaveStatus, trackSave } from "@/lib/save-status";
import { beforeEach, describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

function deferred(): { promise: Promise<void>; resolve: () => void; reject: (error: Error) => void } {
  let resolve: () => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// -- Tests --------------------------------------------------------------------

describe("save-status", () => {
  beforeEach(() => {
    resetSaveStatus();
  });

  it("is saved when nothing is pending", () => {
    expect(getSaveStatus()).toBe("saved");
  });

  it("is saving while a save is pending and saved once it is not", () => {
    setSavePending(true);
    expect(getSaveStatus()).toBe("saving");
    setSavePending(false);
    expect(getSaveStatus()).toBe("saved");
  });

  it("is saving while a write is in flight", async () => {
    const write = deferred();
    const tracked = trackSave("project", write.promise);
    expect(getSaveStatus()).toBe("saving");
    write.resolve();
    await tracked;
    expect(getSaveStatus()).toBe("saved");
  });

  it("is failed after a failed write, and saved after the next good one", async () => {
    await expect(trackSave("project", Promise.reject(new Error("quota")))).rejects.toThrow("quota");
    expect(getSaveStatus()).toBe("failed");
    await trackSave("project", Promise.resolve());
    expect(getSaveStatus()).toBe("saved");
  });

  describe("edge cases", () => {
    it("stays saving until the last of two overlapping writes settles", async () => {
      const first = deferred();
      const second = deferred();
      const a = trackSave("project", first.promise);
      const b = trackSave("audio", second.promise);
      first.resolve();
      await a;
      expect(getSaveStatus()).toBe("saving");
      second.resolve();
      await b;
      expect(getSaveStatus()).toBe("saved");
    });
  });

  describe("invariants", () => {
    it("notifies only when the status changes", () => {
      let calls = 0;
      const unsubscribe = subscribeSaveStatus(() => calls++);
      setSavePending(true);
      setSavePending(true);
      setSavePending(true);
      setSavePending(false);
      unsubscribe();
      expect(calls).toBe(2);
    });

    it("stops notifying after unsubscribe", () => {
      let calls = 0;
      const unsubscribe = subscribeSaveStatus(() => calls++);
      unsubscribe();
      setSavePending(true);
      setSavePending(false);
      expect(calls).toBe(0);
    });
  });

  describe("regressions", () => {
    it("regression: a failed audio write is not hidden by a later successful project write", async () => {
      await expect(trackSave("audio", Promise.reject(new Error("quota")))).rejects.toThrow("quota");
      await trackSave("project", Promise.resolve());
      expect(getSaveStatus()).toBe("failed");
    });

    it("regression: a successful audio write clears only its own failure", async () => {
      await expect(trackSave("audio", Promise.reject(new Error("quota")))).rejects.toThrow("quota");
      await trackSave("audio", Promise.resolve());
      expect(getSaveStatus()).toBe("saved");
    });
  });
});
