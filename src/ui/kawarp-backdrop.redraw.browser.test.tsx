import { allowConsole } from "@/test/console-guard";
import { emulateReducedMotion } from "@/test/reduced-motion";
import { render } from "@/test/render";
import { KawarpBackdrop } from "@/ui/kawarp-backdrop";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// -- Helpers ------------------------------------------------------------------

const Card: React.FC<{ src?: string }> = ({ src }) => (
  <div style={{ width: 400, height: 240 }}>
    <KawarpBackdrop src={src} />
  </div>
);

function solidColorDataUrl(color: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 4;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable in test");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 4, 4);
  return canvas.toDataURL("image/png");
}

function readCenterPixel(canvas: HTMLCanvasElement): Uint8Array {
  const gl = canvas.getContext("webgl") as WebGLRenderingContext;
  const pixel = new Uint8Array(4);
  gl.readPixels(canvas.width >> 1, canvas.height >> 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  return pixel;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Reduced motion collapses Kawarp's crossfade to an instant cut (transitionDuration
// becomes 0), so a single renderFrame after a paint resolves shows the full new
// content instead of a time-blended mix. That determinism is what these tests need.
describe("KawarpBackdrop redraws while idle", () => {
  beforeAll(() => emulateReducedMotion("reduce"));
  afterAll(() => emulateReducedMotion("no-preference"));

  describe("regressions", () => {
    it("regression: redraws after a resize while idle instead of leaving the canvas blank", async () => {
      const screen = await render(<Card />);
      await expect.poll(() => screen.container.querySelector("canvas")).not.toBeNull();
      await wait(200);
      const canvas = screen.container.querySelector("canvas") as HTMLCanvasElement;
      canvas.style.width = "150px";
      canvas.style.height = "90px";
      await expect.poll(() => canvas.width).toBe(150);
      await wait(300);
      const pixel = readCenterPixel(canvas);
      expect(pixel[0] + pixel[1] + pixel[2]).toBeGreaterThan(0);
    });

    it("regression: redraws after a src change while idle instead of leaving the canvas stale", async () => {
      const screen = await render(<Card />);
      await expect.poll(() => screen.container.querySelector("canvas")).not.toBeNull();
      await wait(200);
      await screen.rerender(<Card src={solidColorDataUrl("rgb(220, 20, 20)")} />);
      await wait(300);
      const canvas = screen.container.querySelector("canvas") as HTMLCanvasElement;
      const pixel = readCenterPixel(canvas);
      expect(pixel[0]).toBeGreaterThan(pixel[1]);
      expect(pixel[0]).toBeGreaterThan(pixel[2]);
    });

    it("regression: a slow older src resolving after a newer one does not overwrite it", async () => {
      allowConsole(/could not load the cover art/);
      const screen = await render(<Card src={solidColorDataUrl("rgb(0, 0, 0)")} />);
      await expect.poll(() => screen.container.querySelector("canvas")).not.toBeNull();
      await wait(200);
      await screen.rerender(<Card src="data:image/png;base64,AAAA" />);
      await screen.rerender(<Card src={solidColorDataUrl("rgb(220, 20, 20)")} />);
      const canvas = screen.container.querySelector("canvas") as HTMLCanvasElement;
      await expect.poll(() => readCenterPixel(canvas)[0]).toBeGreaterThan(150);
      await wait(500);
      const pixel = readCenterPixel(canvas);
      expect(pixel[0]).toBeGreaterThan(pixel[1]);
      expect(pixel[0]).toBeGreaterThan(pixel[2]);
    });
  });
});
