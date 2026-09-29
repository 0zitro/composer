import { afterEach, describe, expect, it } from "vitest";
import { useShortcutBindingsStore } from "@/stores/shortcut-bindings";
import { SHORTCUT_DEFINITIONS } from "@/stores/shortcut-definitions";
import { bindingFromKeyboardEvent, findMatchingShortcut, isReservedBrowserShortcut } from "@/utils/shortcut-matcher";

function keydown(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent("keydown", { bubbles: true, ...init });
}

describe("findMatchingShortcut", () => {
  describe("happy paths", () => {
    it("matches a first keydown to its shortcut", () => {
      expect(findMatchingShortcut(keydown({ key: "r" }), "timeline")).toBe("timeline.toggleRollingEdit");
    });

    it("matches held-key repeats of a repeatable shortcut", () => {
      expect(findMatchingShortcut(keydown({ key: "ArrowRight", repeat: true }), "timeline")).toBe(
        "timeline.nudgeRight",
      );
    });
  });

  describe("regressions", () => {
    it("regression: a held toggle key does not re-fire the toggle on every auto-repeat", () => {
      expect(findMatchingShortcut(keydown({ key: "r", repeat: true }), "timeline")).toBeNull();
    });

    it("regression: a held insert-line key does not insert a line per auto-repeat", () => {
      expect(findMatchingShortcut(keydown({ key: "n", repeat: true }), "timeline")).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("returns null for a key with no binding in the scope", () => {
      expect(findMatchingShortcut(keydown({ key: "F13" }), "timeline")).toBeNull();
    });
  });

  describe("invariants", () => {
    it("only nudges and jumps opt into auto-repeat", () => {
      const repeatable = SHORTCUT_DEFINITIONS.filter((definition) => definition.repeatable).map(({ id }) => id);
      for (const id of repeatable) {
        expect(id).toMatch(/\.(nudge|jump)/);
      }
      expect(repeatable).toContain("timeline.nudgeLeft");
      expect(repeatable).toContain("timeline.nudgeRight");
    });
  });
});

describe("bindingFromKeyboardEvent", () => {
  describe("happy paths", () => {
    it("records a plain key", () => {
      expect(bindingFromKeyboardEvent(keydown({ key: "p", code: "KeyP" }))).toEqual({ key: "p" });
    });

    it("records Shift with a lowercase key", () => {
      expect(bindingFromKeyboardEvent(keydown({ key: "P", code: "KeyP", shiftKey: true }))).toEqual({
        key: "p",
        shift: true,
      });
    });

    it("records a named key", () => {
      expect(bindingFromKeyboardEvent(keydown({ key: "ArrowLeft", code: "ArrowLeft" }))).toEqual({ key: "ArrowLeft" });
    });

    it("records a function key", () => {
      expect(bindingFromKeyboardEvent(keydown({ key: "F5", code: "F5" }))).toEqual({ key: "F5" });
    });

    it("records Space as a space", () => {
      expect(bindingFromKeyboardEvent(keydown({ key: " ", code: "Space" }))).toEqual({ key: " " });
    });
  });

  describe("regressions", () => {
    it("regression: macOS Alt+E records the physical key, not the glyph", () => {
      expect(bindingFromKeyboardEvent(keydown({ key: "\u00b4", code: "KeyE", altKey: true }))).toEqual({
        key: "e",
        alt: true,
      });
    });

    it("regression: a recorded macOS Alt binding matches the same key press", () => {
      const event = keydown({ key: "\u00b4", code: "KeyE", altKey: true });
      const binding = bindingFromKeyboardEvent(event);
      if (!binding) throw new Error("expected a binding");
      useShortcutBindingsStore.setState({ overrides: { "timeline.toggleFollow": binding } });
      expect(findMatchingShortcut(event, "timeline")).toBe("timeline.toggleFollow");
    });
  });

  describe("edge cases", () => {
    it.each(["Dead", "Unidentified", "Process", "Compose"])("ignores the non-bindable key %s", (key) => {
      expect(bindingFromKeyboardEvent(keydown({ key }))).toBeNull();
    });

    it.each(["Shift", "Alt", "Control", "Meta", "AltGraph", "CapsLock"])("ignores a bare %s", (key) => {
      expect(bindingFromKeyboardEvent(keydown({ key }))).toBeNull();
    });
  });
});

describe("physical bindings", () => {
  afterEach(() => {
    useShortcutBindingsStore.setState({ overrides: {} });
  });

  describe("capture", () => {
    it("records the code rather than the character the layout produced", () => {
      expect(bindingFromKeyboardEvent(keydown({ key: "w", code: "KeyW" }), { physical: true })).toEqual({
        key: "KeyW",
        physical: true,
      });
    });

    it("records a digit and the space bar by their codes", () => {
      expect(bindingFromKeyboardEvent(keydown({ key: "1", code: "Digit1" }), { physical: true })).toEqual({
        key: "Digit1",
        physical: true,
      });
      expect(bindingFromKeyboardEvent(keydown({ key: " ", code: "Space" }), { physical: true })).toEqual({
        key: "Space",
        physical: true,
      });
    });

    it("keeps recording the character when the binding is not physical", () => {
      expect(bindingFromKeyboardEvent(keydown({ key: "w", code: "KeyW" }))).toEqual({ key: "w" });
    });

    it("ignores a code no binding can name", () => {
      expect(bindingFromKeyboardEvent(keydown({ key: "z", code: "Unidentified" }), { physical: true })).toBeNull();
    });
  });

  describe("matching", () => {
    it("matches the same physical key on a layout that spells it differently", () => {
      useShortcutBindingsStore.setState({
        overrides: { "sync.toggleTextVariant": { key: "KeyW", physical: true } },
      });

      // The AZERTY arrangement puts the key where QWERTY's W sits at `z`, and its code is still KeyW.
      expect(findMatchingShortcut(keydown({ key: "z", code: "KeyW" }), "sync")).toBe("sync.toggleTextVariant");
    });

    it("leaves a logical binding matching the character, not the position", () => {
      useShortcutBindingsStore.setState({ overrides: { "sync.toggleTextVariant": { key: "w" } } });

      expect(findMatchingShortcut(keydown({ key: "z", code: "KeyW" }), "sync")).toBeNull();
      expect(findMatchingShortcut(keydown({ key: "w", code: "KeyZ" }), "sync")).toBe("sync.toggleTextVariant");
    });

    it("still honours the modifiers", () => {
      useShortcutBindingsStore.setState({
        overrides: { "sync.toggleTextVariant": { key: "KeyW", physical: true, shift: true } },
      });

      expect(findMatchingShortcut(keydown({ key: "w", code: "KeyW" }), "sync")).toBeNull();
      expect(findMatchingShortcut(keydown({ key: "w", code: "KeyW", shiftKey: true }), "sync")).toBe(
        "sync.toggleTextVariant",
      );
    });
  });

  describe("reserved browser shortcuts", () => {
    it("reads the code as the key it spells, so Ctrl+W stays reserved", () => {
      expect(isReservedBrowserShortcut({ key: "KeyW", physical: true, mod: true })).toBe(true);
    });

    it("leaves a bare physical key alone", () => {
      expect(isReservedBrowserShortcut({ key: "KeyW", physical: true })).toBe(false);
    });
  });
});
