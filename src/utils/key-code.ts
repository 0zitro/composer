// -- Key codes ----------------------------------------------------------------

/**
 * The key a physical code spells — what a person reads on the keycap. `KeyW` is `w`, `Digit1` is `1`,
 * and the space bar's `Space` is a space.
 *
 * `null` says the code spells nothing of its own: `ArrowLeft` is its own key at either level, and a
 * code no binding can name, such as `Unidentified`, is not a key at all.
 *
 * One home for this grammar, because a binding's own name and the browser's shortcut table must read
 * a code the same way: the matcher decides what a physical binding matches, and the settings list
 * decides what it shows.
 */
function keyFromCode(code: string): string | null {
  const match = /^(?:Key([A-Z])|Digit([0-9]))$/.exec(code);
  if (match) return (match[1] ?? match[2] ?? "").toLowerCase();

  return code === "Space" ? " " : null;
}

// -- Exports ------------------------------------------------------------------

export { keyFromCode };
