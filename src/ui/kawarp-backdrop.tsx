import { useFrameLoop } from "@/hooks/use-frame-loop";
import { usePageVisible } from "@/hooks/use-page-visible";
import { animateFrames } from "@/lib/frame-loop";
import { Kawarp, type KawarpOptions } from "@kawarp/core";
import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

// -- Types --------------------------------------------------------------------

interface KawarpBackdropProps {
  src?: string;
  className?: string;
}

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[KawarpBackdrop]";
const FRAME_LABEL = "kawarp-backdrop";
const KAWARP_OPTIONS: KawarpOptions = {
  warpIntensity: 1,
  blurPasses: 8,
  animationSpeed: 1,
  transitionDuration: 1000,
  saturation: 2,
  dithering: 0.008,
  scale: 1.25,
};
const OPAQUE_CONTEXT: WebGLContextAttributes = {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance",
};
const NEUTRAL_GRADIENT = ["#3e3e41", "#28292c", "#4b4f7a"];
const RESIZE_DEBOUNCE_MS = 120;
const MAX_FRAME_STEP_S = 0.1;

// -- Helpers ------------------------------------------------------------------

function fitCanvas(canvas: HTMLCanvasElement): boolean {
  const { width, height } = canvas.getBoundingClientRect();
  const nextWidth = Math.round(width);
  const nextHeight = Math.round(height);
  if (!nextWidth || !nextHeight || (canvas.width === nextWidth && canvas.height === nextHeight)) return false;
  canvas.width = nextWidth;
  canvas.height = nextHeight;
  return true;
}

function createKawarp(canvas: HTMLCanvasElement): Kawarp | null {
  try {
    if (!canvas.getContext("webgl", OPAQUE_CONTEXT)) throw new Error("WebGL context unavailable");
    return new Kawarp(canvas, KAWARP_OPTIONS);
  } catch (error) {
    console.warn(LOG_PREFIX, "WebGL is not available, keeping the plain backdrop", error);
    return null;
  }
}

async function paintSource(kawarp: Kawarp, src: string | undefined, isCurrent: () => boolean): Promise<void> {
  if (!src) {
    kawarp.loadGradient(NEUTRAL_GRADIENT);
    return;
  }
  try {
    await kawarp.loadImage(src);
  } catch (error) {
    if (!isCurrent()) return;
    console.warn(LOG_PREFIX, "could not load the cover art, using the gradient", error);
    kawarp.loadGradient(NEUTRAL_GRADIENT);
  }
}

// -- Component ----------------------------------------------------------------

const KawarpBackdrop: React.FC<KawarpBackdropProps> = ({ src, className }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const kawarpRef = useRef<Kawarp | null>(null);
  const srcRef = useRef(src);
  const paintedSrcRef = useRef(src);
  const elapsedRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const [painted, setPainted] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const pageVisible = usePageVisible();
  const reducedMotion = useReducedMotion() === true;
  const animating = painted && onScreen && pageVisible && !reducedMotion;

  useEffect(() => {
    srcRef.current = src;
  });

  const paint = useCallback((kawarp: Kawarp, source: string | undefined) => {
    const isCurrent = () => kawarpRef.current === kawarp;
    void paintSource(kawarp, source, isCurrent).then(() => {
      if (isCurrent()) setPainted(true);
    });
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;width:100%;height:100%;";
    mount.appendChild(canvas);
    fitCanvas(canvas);
    const kawarp = createKawarp(canvas);
    if (!kawarp) {
      canvas.remove();
      return;
    }
    kawarpRef.current = kawarp;
    paintedSrcRef.current = srcRef.current;
    paint(kawarp, srcRef.current);

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!fitCanvas(canvas)) return;
        kawarp.resize();
        paint(kawarp, srcRef.current);
      }, RESIZE_DEBOUNCE_MS);
    });
    resizeObserver.observe(canvas);
    const intersectionObserver = new IntersectionObserver(([entry]) => setOnScreen(entry?.isIntersecting ?? false));
    intersectionObserver.observe(mount);

    return () => {
      clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      kawarpRef.current = null;
      kawarp.dispose();
      canvas.remove();
      setPainted(false);
      setOnScreen(false);
    };
  }, [paint]);

  useEffect(() => {
    const kawarp = kawarpRef.current;
    if (!kawarp || paintedSrcRef.current === src) return;
    paintedSrcRef.current = src;
    paint(kawarp, src);
  }, [src, paint]);

  useEffect(() => {
    const kawarp = kawarpRef.current;
    if (!kawarp || !painted) return;
    kawarp.transitionDuration = reducedMotion ? 0 : (KAWARP_OPTIONS.transitionDuration ?? 0);
  }, [painted, reducedMotion]);

  useEffect(() => {
    if (!animating) return;
    const release = animateFrames(FRAME_LABEL);
    return () => {
      release();
      lastFrameRef.current = null;
    };
  }, [animating]);

  useFrameLoop(
    (now) => {
      const kawarp = kawarpRef.current;
      if (!kawarp) return;
      const last = lastFrameRef.current;
      lastFrameRef.current = now;
      if (last !== null) elapsedRef.current += Math.min((now - last) / 1000, MAX_FRAME_STEP_S);
      kawarp.renderFrame(elapsedRef.current);
    },
    FRAME_LABEL,
    animating,
  );

  useEffect(() => {
    if (painted && !animating) kawarpRef.current?.renderFrame(elapsedRef.current);
  }, [painted, animating]);

  return <div ref={mountRef} aria-hidden="true" className={className} />;
};

// -- Exports ------------------------------------------------------------------

export { KawarpBackdrop };
