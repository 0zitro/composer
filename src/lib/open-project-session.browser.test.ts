import {
  adoptOpenProjectId,
  bindSaveTarget,
  ensureOpenProjectId,
  findOpenProjectId,
  forgetOpenProjectId,
  openProjectIdSnapshot,
  subscribeOpenProjectId,
} from "@/lib/open-project-session";
import { setOpenProjectId } from "@/lib/project-repository";
import { getOpenProjectId } from "@/lib/project-storage";
import { describe, expect, it } from "vitest";

describe("open-project-session", () => {
  it("publishes the stored pointer once the lookup resolves", async () => {
    await setOpenProjectId("p1");
    expect(openProjectIdSnapshot()).toBeUndefined();
    expect(await findOpenProjectId()).toBe("p1");
    expect(openProjectIdSnapshot()).toBe("p1");
  });

  it("ensureOpenProjectId creates, stores and publishes an id on a fresh install", async () => {
    const id = await ensureOpenProjectId();
    expect(await getOpenProjectId()).toBe(id);
    expect(openProjectIdSnapshot()).toBe(id);
  });

  it("adoptOpenProjectId switches the id at once and notifies subscribers", async () => {
    let notifications = 0;
    const unsubscribe = subscribeOpenProjectId(() => notifications++);
    adoptOpenProjectId("p2");
    expect(openProjectIdSnapshot()).toBe("p2");
    expect(await ensureOpenProjectId()).toBe("p2");
    expect(await findOpenProjectId()).toBe("p2");
    expect(notifications).toBe(1);
    unsubscribe();
  });

  it("forgetOpenProjectId clears the snapshot", () => {
    adoptOpenProjectId("p2");
    forgetOpenProjectId();
    expect(openProjectIdSnapshot()).toBeUndefined();
  });

  describe("invariants", () => {
    it("a target bound before a switch still resolves to the earlier project", async () => {
      adoptOpenProjectId("a");
      const target = bindSaveTarget();
      adoptOpenProjectId("b");
      expect(await target).toBe("a");
      expect(await bindSaveTarget()).toBe("b");
    });

    it("bindSaveTarget returns the same promise while the id does not change", () => {
      adoptOpenProjectId("a");
      expect(bindSaveTarget()).toBe(bindSaveTarget());
    });

    it("adopting the id that is already open notifies nobody", () => {
      adoptOpenProjectId("a");
      let notifications = 0;
      const unsubscribe = subscribeOpenProjectId(() => notifications++);
      adoptOpenProjectId("a");
      expect(notifications).toBe(0);
      unsubscribe();
    });
  });

  describe("regressions", () => {
    it("regression: a slow first lookup never overwrites an id adopted while it ran", async () => {
      await setOpenProjectId("stored");
      const lookup = findOpenProjectId();
      adoptOpenProjectId("adopted");
      await lookup;
      expect(openProjectIdSnapshot()).toBe("adopted");
      expect(await ensureOpenProjectId()).toBe("adopted");
    });
  });
});
