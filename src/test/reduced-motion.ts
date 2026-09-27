import { cdp } from "vitest/browser";

// -- Helpers --------------------------------------------------------------------

// Motion caches the preference in a module global refreshed only by the media
// query change event, so settle on the event rather than on matchMedia.
async function emulateReducedMotion(value: "reduce" | "no-preference"): Promise<void> {
  const query = window.matchMedia("(prefers-reduced-motion)");
  if (query.matches === (value === "reduce")) return;
  const settled = new Promise<void>((resolve) => query.addEventListener("change", () => resolve(), { once: true }));
  await cdp().send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value }] });
  await settled;
}

// -- Exports ----------------------------------------------------------------

export { emulateReducedMotion };
