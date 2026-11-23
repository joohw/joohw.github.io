"use client";

import { useEffect, useRef } from "react";
import type { createCanopyRenderer } from "./canopy-renderer";
import { bindCanopyGestures } from "./canopy-gestures";
import { rippleCount } from "./canopy-shaders";
import assets from "./canopy-layers.json";

const rippleDuration = 1250;

export function BlogCanopy() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const shell = canvas?.closest<HTMLElement>("[data-blog-shell]");
    if (!canvas || !shell) return;
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

    const addRipple = (clientX: number, clientY: number) => {
      if (!renderer || !motion.matches || document.hidden) return;
      const box = canvas.getBoundingClientRect();
      const x = (clientX - box.left) / box.width;
      const y = (box.bottom - clientY) / box.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      if (ripples.length === rippleCount) ripples.shift();
      ripples.push({ x, y, started: performance.now() });
    };
    const gestures = bindCanopyGestures(shell, canvas, (x, y) => renderer?.pick(x, y) ?? null, () => {
      if (!frame && renderer && !document.hidden) frame = requestAnimationFrame(tick);
    }, addRipple);
    const tick = (now: number) => {
      frame = 0;
      if (!renderer) return;
      const elapsed = now - lastFrame;
      const animate = motion.matches;
      if (elapsed >= 30 || !animate) {
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
        renderer.draw(animate ? seconds : 0,
          gestures.step(delta, !animate), animate && ripples.length ? drops : undefined);
        canvas.style.visibility = "visible";
        lastFrame = now;
      }
      if (animate) frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (lost || document.hidden || !motion.matches) ripples.length = 0;
      if (!createRenderer || lost || images.some(([image, , width, height]) =>
        !image.complete || image.naturalWidth !== width || image.naturalHeight !== height,
      )) {
        canvas.style.visibility = "hidden";
        return;
      }
      if (document.hidden) return;
      if (!renderer) {
        renderer = createRenderer(canvas, background, leafImages, showLeafOutlines);
        renderer?.resize();
      }
      if (renderer) {
        lastFrame = performance.now() - 32;
        frame = requestAnimationFrame(tick);
      }
    };
    const onLoss = (event: Event) => {
      event.preventDefault();
      lost = true;
      renderer?.dispose();
      renderer = null;
      gestures.release();
      sync();
    };
    const onRestore = () => { lost = false; sync(); };
    const observer = new ResizeObserver(() => {
      renderer?.resize();
      if (renderer && !frame && !document.hidden) frame = requestAnimationFrame(tick);
    });
    observer.observe(canvas);
    for (const [image, name] of images) {
      image.onload = sync;
      image.src = `/images/${name}`;
    }
    canvas.addEventListener("webglcontextlost", onLoss);
    canvas.addEventListener("webglcontextrestored", onRestore);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    void import("./canopy-renderer").then(module => {
      if (disposed) return;
      createRenderer = module.createCanopyRenderer;
      sync();
    }, () => { canvas.style.visibility = "hidden"; });

    return () => {
      disposed = true;
      gestures.dispose();
      cancelAnimationFrame(frame);
      observer.disconnect();
      for (const [image] of images) image.onload = null;
      renderer?.dispose();
      canvas.style.visibility = "hidden";
      canvas.removeEventListener("webglcontextlost", onLoss);
      canvas.removeEventListener("webglcontextrestored", onRestore);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="blog-scene pointer-events-none fixed inset-0 -z-10"
    >
      <canvas ref={canvasRef} data-canopy="" className="invisible absolute inset-0 h-full w-full" />
    </div>
  );
}
