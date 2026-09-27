import { PROJECT_CHANNEL_NAME, announceProjectsDeleted, subscribeProjectsDeleted } from "@/lib/project-channel";
import { removeProjectData, saveProjectRecord } from "@/lib/project-repository";
import { clearAllProjects } from "@/lib/project-storage";
import { storedProject } from "@/test/projects";
import { afterEach, describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

const openChannels: BroadcastChannel[] = [];

function otherTab(): BroadcastChannel {
  const channel = new BroadcastChannel(PROJECT_CHANNEL_NAME);
  openChannels.push(channel);
  return channel;
}

function nextMessage(channel: BroadcastChannel): Promise<unknown> {
  return new Promise((resolve) => {
    channel.onmessage = (event: MessageEvent<unknown>) => resolve(event.data);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -- Tests --------------------------------------------------------------------

describe("project-channel", () => {
  afterEach(() => {
    for (const channel of openChannels.splice(0)) channel.close();
  });

  it("removing a project tells other tabs", async () => {
    const tab = otherTab();
    const received = nextMessage(tab);
    await saveProjectRecord("p1", storedProject());
    await removeProjectData("p1");
    expect(await received).toMatchObject({ type: "projects-deleted", ids: ["p1"] });
  });

  it("clearing every project tells other tabs which ids went away", async () => {
    const tab = otherTab();
    const received = nextMessage(tab);
    await saveProjectRecord("p1", storedProject());
    await saveProjectRecord("p2", storedProject());
    await clearAllProjects();
    const message = (await received) as { ids: string[] };
    expect(message.ids.toSorted()).toEqual(["p1", "p2"]);
  });

  it("a subscriber hears deletions from another tab", async () => {
    const heard: string[][] = [];
    const unsubscribe = subscribeProjectsDeleted((ids) => heard.push(ids));
    otherTab().postMessage({ type: "projects-deleted", ids: ["p9"], sender: "another-tab" });
    await expect.poll(() => heard).toEqual([["p9"]]);
    unsubscribe();
  });

  describe("edge cases", () => {
    it("a subscriber ignores its own tab's announcements", async () => {
      const heard: string[][] = [];
      const unsubscribe = subscribeProjectsDeleted((ids) => heard.push(ids));
      const tab = otherTab();
      const received = nextMessage(tab);
      announceProjectsDeleted(["mine"]);
      await received;
      await sleep(50);
      expect(heard).toEqual([]);
      unsubscribe();
    });

    it("a subscriber ignores malformed messages", async () => {
      const heard: string[][] = [];
      const unsubscribe = subscribeProjectsDeleted((ids) => heard.push(ids));
      const tab = otherTab();
      tab.postMessage("projects-deleted");
      tab.postMessage({ type: "projects-deleted", ids: "p1", sender: "x" });
      tab.postMessage({ type: "something-else", ids: ["p1"], sender: "x" });
      await sleep(50);
      expect(heard).toEqual([]);
      unsubscribe();
    });

    it("announcing no ids posts nothing", async () => {
      const tab = otherTab();
      let received = false;
      tab.onmessage = () => {
        received = true;
      };
      announceProjectsDeleted([]);
      await sleep(50);
      expect(received).toBe(false);
    });
  });
});
