import { downloadProjectFile, projectFileFrom } from "@/lib/project-file";
import { storedProject } from "@/test/projects";
import { describe, expect, it } from "vitest";

describe("downloadProjectFile", () => {
  it("clicks a temporary download link named after the project and removes it", async () => {
    const added: HTMLAnchorElement[] = [];
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) if (node instanceof HTMLAnchorElement) added.push(node);
      }
    });
    observer.observe(document.body, { childList: true });
    downloadProjectFile(projectFileFrom("p1", storedProject()));
    await expect.poll(() => added.length).toBe(1);
    observer.disconnect();
    expect(added[0]?.download).toMatch(/^Midnight City-\d{4}-\d{2}-\d{2}\.ttml-project\.json$/);
    expect(added[0]?.isConnected).toBe(false);
  });
});
