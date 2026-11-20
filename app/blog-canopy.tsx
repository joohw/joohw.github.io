"use client";

import { useEffect, useRef } from "react";
import { createCanopyRenderer } from "./canopy-renderer";
import { bindCanopyGestures } from "./canopy-gestures";
import assets from "./canopy-layers.json";

export function BlogCanopy() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const main = canvas?.closest("main");
    if (!canvas || !main) return;
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const underpainting = new Image();
    const blades = new Image();
    let renderer: ReturnType<typeof createCanopyRenderer> = null;
    let frame = 0;
    let lastFrame = 0;
    let seconds = 0;
    let x = 0;
    let y = 0;
    let targetX = 0;
    let targetY = 0;
    let lost = false;

    const gestures = bindCanopyGestures(main, canvas, (x, y) => renderer?.pick(x, y) ?? null, () => {
      if (!frame && renderer && !document.hidden) frame = requestAnimationFrame(tick);
    });
    const tick = (now: number) => {
      frame = 0;
      if (!renderer) return;
      const elapsed = now - lastFrame;
      if (elapsed >= 30 || !motion.matches) {
        const delta = Math.min(elapsed, 80) / 1000;
        const catchUp = 1 - Math.exp(-delta * 5);
        seconds += delta;
        x += (targetX - x) * catchUp;
        y += (targetY - y) * catchUp;
        renderer.draw(motion.matches ? seconds : 0, motion.matches ? x : 0, motion.matches ? y : 0,
          gestures.step(delta, !motion.matches));
        canvas.style.visibility = "visible";
        lastFrame = now;
      }
      if (motion.matches) frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (lost || !underpainting.complete || !underpainting.naturalWidth || !blades.complete || !blades.naturalWidth) {
        canvas.style.visibility = "hidden";
        return;
      }
      if (document.hidden) return;
      if (!renderer) {
        renderer = createCanopyRenderer(canvas, underpainting, blades);
        renderer?.resize();
      }
      if (renderer) {
        lastFrame = performance.now() - 32;
        frame = requestAnimationFrame(tick);
      }
    };
    const pan = (event: PointerEvent) => {
      if (event.pointerType === "touch" || main.hasAttribute("data-leaf-grabbed")) return;
      targetX = (0.5 - event.clientX / window.innerWidth) * 10;
      targetY = (0.5 - event.clientY / window.innerHeight) * 7;
    };
    const center = () => { targetX = targetY = 0; };
    const onLoss = (event: Event) => {
      event.preventDefault();
      lost = true;
      renderer = null;
      sync();
    };
    const onRestore = () => { lost = false; sync(); };
    const observer = new ResizeObserver(() => {
      renderer?.resize();
      if (renderer && !frame && !document.hidden) frame = requestAnimationFrame(tick);
    });
    observer.observe(canvas);
    underpainting.onload = blades.onload = sync;
    underpainting.src = `/images/${assets.underpaint}`;
    blades.src = `/images/${assets.atlas}`;
    canvas.addEventListener("webglcontextlost", onLoss);
    canvas.addEventListener("webglcontextrestored", onRestore);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    window.addEventListener("pointermove", pan, { passive: true });
    document.documentElement.addEventListener("pointerleave", center);
    window.addEventListener("blur", center);

    return () => {
      gestures.dispose();
      cancelAnimationFrame(frame);
      observer.disconnect();
      underpainting.onload = blades.onload = null;
      renderer?.dispose();
      canvas.style.visibility = "hidden";
      canvas.removeEventListener("webglcontextlost", onLoss);
      canvas.removeEventListener("webglcontextrestored", onRestore);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
      window.removeEventListener("pointermove", pan);
      document.documentElement.removeEventListener("pointerleave", center);
      window.removeEventListener("blur", center);
    };
  }, []);

  return (
    <div aria-hidden="true" className="blog-scene pointer-events-none fixed inset-0 -z-10">
      <canvas ref={canvasRef} className="invisible block h-full w-full" />
    </div>
  );
}
