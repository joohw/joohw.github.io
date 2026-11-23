"use client";

import { type KeyboardEvent, type PointerEvent, useEffect, useRef } from "react";

function pageScrollRange() {
  const root = document.scrollingElement ?? document.documentElement;
  return Math.max(0, root.scrollHeight - document.documentElement.clientHeight);
}

export function BlogScrollbar() {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointer: number; offset: number } | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const range = pageScrollRange();
      track.hidden = range === 0;
      if (!range) return;

      const viewport = document.documentElement.clientHeight;
      const height = track.clientHeight;
      const thumbHeight = Math.min(height, Math.max(32, height * viewport / (viewport + range)));
      const fraction = Math.max(0, Math.min(1, window.scrollY / range));
      thumb.style.height = `${thumbHeight}px`;
      thumb.style.transform = `translateY(${(height - thumbHeight) * fraction}px)`;
      track.setAttribute("aria-valuenow", String(Math.round(fraction * 100)));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const moveThumb = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer !== event.pointerId || !thumbRef.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const travel = bounds.height - thumbRef.current.getBoundingClientRect().height;
    if (travel <= 0) return;
    const fraction = (event.clientY - bounds.top - drag.current.offset) / travel;
    window.scrollTo(0, Math.max(0, Math.min(1, fraction)) * pageScrollRange());
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || !thumbRef.current) return;
    const thumb = thumbRef.current.getBoundingClientRect();
    const onThumb = event.clientY >= thumb.top && event.clientY <= thumb.bottom;
    drag.current = { pointer: event.pointerId, offset: onThumb ? event.clientY - thumb.top : thumb.height / 2 };
    event.currentTarget.setPointerCapture(event.pointerId);
    moveThumb(event);
  };

  const stopDrag = () => { drag.current = null; };

  const scrollWithKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const viewport = document.documentElement.clientHeight;
    let top = window.scrollY;
    switch (event.key) {
      case "ArrowUp": top -= 48; break;
      case "ArrowDown": top += 48; break;
      case "PageUp": top -= viewport; break;
      case "PageDown": top += viewport; break;
      case "Home": top = 0; break;
      case "End": top = pageScrollRange(); break;
      default: return;
    }
    event.preventDefault();
    window.scrollTo(0, top);
  };

  return (
    <div
      ref={trackRef}
      className="blog-scrollbar"
      hidden
      role="scrollbar"
      aria-label="Page scroll"
      aria-controls="blog-content"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      tabIndex={0}
      onPointerDown={startDrag}
      onPointerMove={moveThumb}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onLostPointerCapture={stopDrag}
      onKeyDown={scrollWithKey}
    >
      <div ref={thumbRef} className="blog-scrollbar-thumb" />
    </div>
  );
}
