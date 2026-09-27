import { findMatchingShortcut } from "@/utils/shortcut-matcher";
import { describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

function keyEvent(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
}

// -- Tests --------------------------------------------------------------------

describe("findMatchingShortcut", () => {
  it("matches Ctrl+Alt+N to the new project shortcut", () => {
    const event = keyEvent({ key: "n", code: "KeyN", ctrlKey: true, altKey: true });
    expect(findMatchingShortcut(event, "global")).toBe("global.newProject");
  });

  describe("regressions", () => {
    it("does not match AltGr+N even though it reports ctrlKey and altKey (issue: AltGr new-project trigger)", () => {
      const event = keyEvent({
        key: "ń",
        code: "KeyN",
        ctrlKey: true,
        altKey: true,
        modifierAltGraph: true,
      } as KeyboardEventInit);
      expect(findMatchingShortcut(event, "global")).toBeNull();
    });
  });
});
