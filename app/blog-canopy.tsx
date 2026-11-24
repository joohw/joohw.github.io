"use client";

import { useEffect, useRef, useState } from "react";
import type { createCanopyRenderer } from "./canopy-renderer";
import { canopyFrame, edgeBend } from "./canopy-frame";
import { bindCanopyGestures } from "./canopy-gestures";
import { rippleCount } from "./canopy-shaders";
import { CanopyLoading, type CanopyLoadState } from "./canopy-loading";
import assets from "./canopy-assets.json";

const rippleDuration = 1250;
const resizeSettleMs = 150;

export function BlogCanopy() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const [loading, setLoading] = useState<CanopyLoadState>({
    phase: "loading", loaded: 0, total: assets.leaves.length + 2, slow: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const poster = posterRef.current;
    const shell = canvas?.closest<HTMLElement>("[data-blog-shell]");
    if (!canvas || !poster || !shell) return;
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
    const mode = new URLSearchParams(window.location.search).get("canopy");
    const showLeafOutlines = local && mode === "outlines";

    const background = new Image();
    const leafImages = assets.leaves.map(() => new Image());
    const [artWidth, artHeight] = assets.size;
    const images: [HTMLImageElement, string, number, number][] = [
      [background, assets.background, artWidth, artHeight],
    ];
    assets.leaves.forEach(({ texture, textureSize }, i) => {
      images.push([leafImages[i], texture, textureSize[0], textureSize[1]]);
    });
    const ripples: { x: number; y: number; started: number }[] = [];
    const drops = new Float32Array(rippleCount * 3);
    let createRenderer: typeof createCanopyRenderer | undefined;
    let renderer: ReturnType<typeof createCanopyRenderer> = null;
    let frame = 0;
    let lastFrame = 0;
    let seconds = 0;
    let lost = false;
    let disposed = false;
    let failed = false;
    let sceneStarted = false;
    let sceneReady = false;
    let slow = false;
    let progressTimer: number | undefined;
    let needsResize = true;
    let resizeTimer: number | undefined;
    let lastDpr = window.devicePixelRatio;

    const updateProgress = () => {
      if (disposed) return;
      const posterReady = poster.complete && poster.naturalWidth > 0;
      const loadedTextures = images.filter(([image, , width, height]) =>
        image.complete && image.naturalWidth === width && image.naturalHeight === height,
      ).length;
      const total = motion.matches ? images.length + 1 : 1;
      let loaded = Number(posterReady) + (motion.matches ? loadedTextures : 0);
      let phase: CanopyLoadState["phase"] = "loading";
      if (!motion.matches) {
        if (posterReady) phase = "ready";
        else if (poster.complete) phase = "error";
      } else if (failed || lost) {
        phase = posterReady ? "fallback" : "error";
      } else if (sceneReady) {
        phase = "ready";
      } else if (sceneStarted && loadedTextures === images.length) {
        phase = "preparing";
      }
      if (phase === "ready") loaded = total;
      if (phase === "ready" || phase === "fallback" || phase === "error") {
        window.clearTimeout(progressTimer);
      }
      setLoading(previous => previous.phase === phase && previous.loaded === loaded &&
        previous.total === total && previous.slow === slow
        ? previous : { phase, loaded, total, slow });
    };
    const startProgressTimer = () => {
      window.clearTimeout(progressTimer);
      slow = false;
      progressTimer = window.setTimeout(() => {
        slow = true;
        updateProgress();
      }, 10000);
    };
    startProgressTimer();

    const positionPoster = () => {
      const width = canvas.clientWidth, height = canvas.clientHeight;
      const margin = edgeBend + 1;
      const { scale, left } = canopyFrame(width, height);
      const remaining = width - (artWidth - margin * 2) * scale;
      const anchor = Math.abs(remaining) > 0.001 ? (left + margin * scale) / remaining : 0.5;
      poster.style.objectPosition = `${anchor * 100}% 50%`;
    };
    positionPoster();
    const abandonRenderer = () => {
      failed = true;
      sceneReady = false;
      canvas.style.visibility = "hidden";
      renderer?.dispose();
      renderer = null;
      updateProgress();
    };
    const addRipple = (clientX: number, clientY: number) => {
      if (!renderer || !motion.matches || document.hidden) return;
      const box = canvas.getBoundingClientRect();
      const x = (clientX - box.left) / box.width;
      const y = (box.bottom - clientY) / box.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      if (ripples.length === rippleCount) ripples.shift();
      ripples.push({ x, y, started: performance.now() });
    };
    const requestDraw = () => {
      if (!frame && renderer && motion.matches && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const gestures = bindCanopyGestures(shell, canvas,
      (x, y) => motion.matches ? renderer?.pick(x, y) ?? null : null, requestDraw, addRipple);
    const tick = (now: number) => {
      frame = 0;
      if (!renderer) return;
      if (!motion.matches) {
        canvas.style.visibility = "hidden";
        gestures.release();
        updateProgress();
        return;
      }
      const elapsed = now - lastFrame;
      const animate = motion.matches;
      const settled = resizeTimer === undefined;
      if (lastDpr !== window.devicePixelRatio) {
        lastDpr = window.devicePixelRatio;
        needsResize = true;
      }
      if (elapsed >= 30 || (settled && (!animate || needsResize))) {
        if (needsResize) {
          try { renderer.resize(settled); }
          catch { abandonRenderer(); return; }
          needsResize = false;
        }
        const delta = Math.min(elapsed, 80) / 1000;
        seconds += delta;
        while (ripples.length && now - ripples[0].started >= rippleDuration) ripples.shift();
        if (ripples.length) {
          drops.fill(1);
          ripples.forEach(({ x, y, started }, index) => {
            drops[index * 3] = x;
            drops[index * 3 + 1] = y;
            drops[index * 3 + 2] = Math.max(0, (now - started) / rippleDuration);
          });
        }
        try {
          renderer.draw(animate ? seconds : 0,
            gestures.step(delta, !animate), animate && ripples.length ? drops : undefined);
        } catch { abandonRenderer(); return; }
        canvas.style.visibility = "visible";
        if (!sceneReady) {
          sceneReady = true;
          updateProgress();
        }
        lastFrame = now;
      }
      if (animate || needsResize) frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      updateProgress();
      cancelAnimationFrame(frame);
      frame = 0;
      if (lost || document.hidden || !motion.matches) ripples.length = 0;
      if (!motion.matches || failed || !createRenderer || lost || images.some(([image, , width, height]) =>
        !image.complete || image.naturalWidth !== width || image.naturalHeight !== height,
      )) {
        canvas.style.visibility = "hidden";
        return;
      }
      if (document.hidden) return;
      if (!renderer) {
        try { renderer = createRenderer(canvas, background, leafImages, showLeafOutlines); }
        catch { abandonRenderer(); return; }
        if (!renderer) { abandonRenderer(); return; }
      }
      if (renderer) {
        needsResize = true;
        lastFrame = performance.now() - 32;
        frame = requestAnimationFrame(tick);
      }
    };
    const onLoss = (event: Event) => {
      event.preventDefault();
      lost = true;
      sceneReady = false;
      renderer?.dispose();
      renderer = null;
      gestures.release();
      sync();
    };
    const onRestore = () => { lost = false; failed = false; sync(); };
    const scheduleResize = () => {
      positionPoster();
      needsResize = true;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resizeTimer = undefined;
        needsResize = true;
        requestDraw();
      }, resizeSettleMs);
      requestDraw();
    };
    const observer = new ResizeObserver(scheduleResize);
    observer.observe(canvas);
    // The fixed scene also changes physical size when only the display scale changes.
    if ("devicePixelContentBoxSize" in ResizeObserverEntry.prototype && canvas.parentElement) {
      observer.observe(canvas.parentElement, { box: "device-pixel-content-box" });
    }
    const displayResolution = () => window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    let resolution = displayResolution();
    const onResolutionChange = () => {
      resolution = displayResolution();
      resolution.addEventListener("change", onResolutionChange, { once: true });
      scheduleResize();
    };
    resolution.addEventListener("change", onResolutionChange, { once: true });
    // Keep the static first image ahead of the interactive scene's texture requests.
    const loadScene = () => {
      updateProgress();
      if (disposed || sceneStarted || !poster.complete || !motion.matches) return;
      sceneStarted = true;
      startProgressTimer();
      for (const [image, name, width, height] of images) {
        image.onload = () => {
          if (image.naturalWidth !== width || image.naturalHeight !== height) abandonRenderer();
          sync();
        };
        image.onerror = abandonRenderer;
        image.decoding = "async";
        image.fetchPriority = "low";
        image.src = `/images/${name}`;
      }
      void import("./canopy-renderer").then(module => {
        if (disposed) return;
        createRenderer = module.createCanopyRenderer;
        sync();
      }, () => { if (!disposed) abandonRenderer(); });
    };
    const onMotionChange = () => {
      if (!motion.matches) gestures.release();
      if (motion.matches && sceneStarted && !sceneReady && !failed) startProgressTimer();
      loadScene();
      sync();
    };
    poster.addEventListener("load", loadScene);
    poster.addEventListener("error", loadScene);
    canvas.addEventListener("webglcontextlost", onLoss);
    canvas.addEventListener("webglcontextrestored", onRestore);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", onMotionChange);
    loadScene();

    return () => {
      disposed = true;
      gestures.dispose();
      cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      window.clearTimeout(progressTimer);
      resolution.removeEventListener("change", onResolutionChange);
      observer.disconnect();
      for (const [image] of images) { image.onload = null; image.onerror = null; }
      renderer?.dispose();
      canvas.style.visibility = "hidden";
      poster.removeEventListener("load", loadScene);
      poster.removeEventListener("error", loadScene);
      canvas.removeEventListener("webglcontextlost", onLoss);
      canvas.removeEventListener("webglcontextrestored", onRestore);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <>
    <div
      aria-hidden="true"
      className="blog-scene pointer-events-none fixed inset-0 -z-10"
    >
      {/* The static export discovers this image before JavaScript or WebGL is ready. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={posterRef}
        src={`/images/${assets.poster}`}
        width={assets.size[0] - (edgeBend + 1) * 2}
        height={assets.size[1] - (edgeBend + 1) * 2}
        alt=""
        loading="eager"
        fetchPriority="high"
        decoding="async"
        draggable={false}
        className="blog-scene-poster"
      />
      <canvas ref={canvasRef} data-canopy="" className="invisible absolute inset-0 h-full w-full" />
    </div>
    <CanopyLoading state={loading} />
    </>
  );
}
