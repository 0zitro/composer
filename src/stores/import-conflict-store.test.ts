import type { ImportConflict } from "@/lib/project-import";
import { useImportConflictStore } from "@/stores/import-conflict-store";
import { indexEntry } from "@/test/index-entries";
import { describe, expect, it, vi } from "vitest";

const CONFLICT: ImportConflict = {
  reason: "same-project",
  existing: indexEntry("a", { title: "Alpha" }),
  file: {
    version: 3,
    savedAt: 1,
    projectId: "a",
    metadata: { title: "Alpha", artists: [], album: "", duration: 0 },
    agents: [],
    lines: [],
    granularity: "word",
  },
};

describe("useImportConflictStore", () => {
  it("resolves the prompt with the chosen answer and closes it", async () => {
    const choice = useImportConflictStore.getState().ask(CONFLICT);
    expect(useImportConflictStore.getState().conflict).toBe(CONFLICT);
    useImportConflictStore.getState().answer("keep-both");
    await expect(choice).resolves.toBe("keep-both");
    expect(useImportConflictStore.getState().conflict).toBeNull();
  });

  describe("edge cases", () => {
    it("cancels a second prompt while one is open and warns", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const first = useImportConflictStore.getState().ask(CONFLICT);
      await expect(useImportConflictStore.getState().ask(CONFLICT)).resolves.toBe("cancel");
      useImportConflictStore.getState().answer("replace");
      await expect(first).resolves.toBe("replace");
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    });
  });
});
