import { bindingsEqual, getEffectiveBinding } from "@/stores/shortcut-bindings";
import { type ShortcutBinding, type ShortcutScope, getShortcutsByScope } from "@/stores/shortcut-registry";
import { isMac } from "@/utils/platform";

// -- Matching -----------------------------------------------------------------

// On macOS, holding Option/Alt rewrites `event.key` to the layout-specific
// glyph (Alt+E → "´", Alt+Shift+E → "´") instead of the base letter. Fall back
// to `event.code` (e.g., "KeyE", "Digit1") which reflects the physical key
// regardless of modifiers, so alt-bearing bindings still match.
function getEventKey(event: KeyboardEvent): string {
  if (event.altKey) {
    if (event.code.startsWith("Key") && event.code.length === 4) return event.code.slice(3).toLowerCase();
    if (event.code.startsWith("Digit") && event.code.length === 6) return event.code.slice(5);
  }
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}

const MODIFIER_KEYS = new Set([
  "Shift",
  "Alt",
  "Control",
  "Meta",
  "AltGraph",
  "CapsLock",
  "Fn",
  "FnLock",
  "Hyper",
  "Super",
  "OS",
]);
const NAMED_BINDABLE_KEYS = new Set([
  "Enter",
  "Tab",
  "Backspace",
  "Delete",
  "Insert",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);
const FUNCTION_KEY = /^F([1-9]|1\d|2[0-4])$/;
const PHYSICAL_LETTER_KEY = /^Key[A-Z]$/;
const PHYSICAL_DIGIT_KEY = /^Digit[0-9]$/;
// A physical binding holds `event.code`. The named keys are spelled the same as their codes, except
// that the space bar's code is `Space` where its key is a space.
const NAMED_BINDABLE_CODES = new Set([...NAMED_BINDABLE_KEYS, "Space"]);

function isBindableKey(key: string): boolean {
  return key.length === 1 || NAMED_BINDABLE_KEYS.has(key) || FUNCTION_KEY.test(key);
}

function isBindableCode(code: string): boolean {
  return (
    PHYSICAL_LETTER_KEY.test(code) || PHYSICAL_DIGIT_KEY.test(code) || NAMED_BINDABLE_CODES.has(code) || FUNCTION_KEY.test(code)
  );
}

function bindingFromKeyboardEvent(
  event: KeyboardEvent,
  { physical = false }: { physical?: boolean } = {},
): ShortcutBinding | null {
  if (MODIFIER_KEYS.has(event.key)) return null;
  const key = physical ? event.code : getEventKey(event);
  if (physical ? !isBindableCode(key) : !isBindableKey(key)) return null;
  const modPressed = isMac ? event.metaKey : event.ctrlKey;
  const rawCtrl = isMac && event.ctrlKey;
  const rawMeta = !isMac && event.metaKey;
  return {
    key,
    ...(physical && { physical: true as const }),
    ...(event.shiftKey && { shift: true }),
    ...(event.altKey && { alt: true }),
    ...(modPressed && { mod: true }),
    ...(rawCtrl && { ctrl: true }),
    ...(rawMeta && { meta: true }),
  };
}

function matchesKey(event: KeyboardEvent, binding: ShortcutBinding): boolean {
  if (binding.key === "") return false;
  if (binding.physical) return event.code === binding.key;

  const eventKey = getEventKey(event);
  const bindingKey = binding.key.length === 1 ? binding.key.toLowerCase() : binding.key;

  return eventKey === bindingKey;
}

function matchesBinding(event: KeyboardEvent, binding: ShortcutBinding): boolean {
  if (!matchesKey(event, binding)) return false;
  if (!!binding.shift !== event.shiftKey) return false;
  if (!!binding.alt !== event.altKey) return false;

  if (binding.mod) {
    const modActive = isMac ? event.metaKey : event.ctrlKey;
    if (!modActive) return false;
    return true;
  }

  if (!!binding.ctrl !== event.ctrlKey) return false;
  if (!!binding.meta !== event.metaKey) return false;

  return true;
}

function findMatchingShortcut(event: KeyboardEvent, scope: ShortcutScope): string | null {
  const shortcuts = getShortcutsByScope(scope);
  for (const shortcut of shortcuts) {
    const binding = getEffectiveBinding(shortcut.id);
    if (matchesBinding(event, binding)) return event.repeat && !shortcut.repeatable ? null : shortcut.id;
  }
  return null;
}

// -- Reserved Browser Shortcuts -----------------------------------------------

const RESERVED_BROWSER_SHORTCUTS: ShortcutBinding[] = [
  // Tab/window management
  { key: "t", mod: true },
  { key: "n", mod: true },
  { key: "n", mod: true, shift: true },
  { key: "w", mod: true },
  { key: "w", mod: true, shift: true },
  { key: "Tab", ctrl: true },
  ...(isMac ? [{ key: "Tab", meta: true, alt: true }] : []),
  ...(isMac ? [{ key: "q", meta: true }] : []),

  // Navigation
  { key: "l", mod: true },
  { key: "r", mod: true },
  { key: "r", mod: true, shift: true },

  // Find
  { key: "f", mod: true },
  { key: "g", mod: true },

  // Page actions
  { key: "p", mod: true },
  { key: "s", mod: true },
  { key: "d", mod: true },

  // Developer tools
  ...(isMac
    ? [
        { key: "i", meta: true, alt: true },
        { key: "j", meta: true, alt: true },
      ]
    : [
        { key: "I", ctrl: true, shift: true },
        { key: "J", ctrl: true, shift: true },
      ]),
  { key: "u", mod: true },

  // History
  ...(isMac
    ? [
        { key: "h", meta: true },
        { key: "[", meta: true },
        { key: "]", meta: true },
      ]
    : [{ key: "h", ctrl: true }]),

  // Zoom
  { key: "=", mod: true },
  { key: "-", mod: true },
  { key: "0", mod: true },
];

/** The key as the reserved table above spells it: a physical binding holds a code, not a character. */
function logicalKeyOf(binding: ShortcutBinding): string {
  if (!binding.physical) return binding.key;
  const match = /^(?:Key([A-Z])|Digit([0-9]))$/.exec(binding.key);
  if (match) return (match[1] ?? match[2] ?? "").toLowerCase();

  return binding.key === "Space" ? " " : binding.key;
}

function isReservedBrowserShortcut(binding: ShortcutBinding): boolean {
  // A physical binding is still the browser's shortcut when its code spells that key: Ctrl+W closes
  // the tab whether it was recorded as `w` or as `KeyW`, so the comparison drops the distinction.
  const { shift, alt, ctrl, meta, mod } = binding;
  const asLogical: ShortcutBinding = {
    key: logicalKeyOf(binding),
    ...(shift && { shift: true }),
    ...(alt && { alt: true }),
    ...(ctrl && { ctrl: true }),
    ...(meta && { meta: true }),
    ...(mod && { mod: true }),
  };

  return RESERVED_BROWSER_SHORTCUTS.some((reserved) => bindingsEqual(reserved, asLogical));
}

// -- Exports ------------------------------------------------------------------

export { bindingFromKeyboardEvent, findMatchingShortcut, isReservedBrowserShortcut };
