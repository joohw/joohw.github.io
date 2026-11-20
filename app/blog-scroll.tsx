"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { BlogCanopy } from "./blog-canopy";
import { BlogIntro } from "./blog-intro";

type BlogSection = {
  id: string;
  title: string;
  heading: string;
  description: string;
  content: ReactNode;
  featured?: boolean;
};

export function BlogScroll({
  overview,
  sections,
}: {
  overview: Pick<BlogSection, "heading" | "description">;
  sections: BlogSection[];
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const readingRef = useRef<HTMLElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sections.find(({ id }) => id === selectedId);
  const reading = selected ?? overview;

  useEffect(() => {
    const stage = stageRef.current;
    const nav = navRef.current;
    if (!stage || !nav) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncHeader = () => {
      const scrollTop = Math.max(0, window.scrollY);
      const showNav = scrollTop >= 64;
      const progress = motion.matches ? Number(showNav) : Math.min(scrollTop / 200, 1);
      stage.style.setProperty("--intro-progress", String(progress));
      nav.toggleAttribute("data-visible", showNav);
    };

    syncHeader();
    window.addEventListener("scroll", syncHeader, { passive: true });
    motion.addEventListener("change", syncHeader);
    return () => {
      window.removeEventListener("scroll", syncHeader);
      motion.removeEventListener("change", syncHeader);
    };
  }, []);

  const selectSection = (id: string | null) => {
    setSelectedId(id);
    if (id) document.getElementById(`blog-nav-${id}`)?.focus({ preventScroll: true });
    readingRef.current?.scrollIntoView();
  };

  return (
    <main className="blog-scroll isolate">
      <BlogCanopy />
      <div ref={stageRef} className="blog-stage relative min-h-dvh text-foreground">
        <BlogIntro />
      </div>

      <nav
        ref={navRef}
        aria-label="站点导航"
        className="blog-section-nav fixed z-20 flex flex-wrap justify-end gap-1 sm:gap-2"
      >
        {sections.map(({ id, title }) => (
          <button
            key={id}
            id={`blog-nav-${id}`}
            type="button"
            aria-controls="blog-selected-section"
            aria-pressed={id === selectedId}
            className="pointer-events-auto min-h-11 px-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:underline aria-pressed:text-foreground aria-pressed:underline sm:px-3"
            onClick={() => selectSection(id)}
          >
            {title}
          </button>
        ))}
      </nav>

      <section
        ref={readingRef}
        id="blog-selected-section"
        tabIndex={-1}
        aria-labelledby="blog-reading-title"
        className="blog-reading relative z-10 min-h-dvh px-8 pb-16 pt-10 text-foreground sm:pt-16"
      >
        <div className="mx-auto max-w-5xl">
          <div className="max-w-2xl space-y-5">
            <h2 id="blog-reading-title" className="text-3xl font-light leading-tight tracking-tight sm:text-5xl">
              {reading.heading}
            </h2>
            <p className="text-base leading-loose text-muted-foreground sm:text-lg">
              {reading.description}
            </p>
          </div>

          {selected ? (
            <div className="mt-10 max-w-2xl space-y-6">
              <div className="space-y-5 border border-foreground/20 bg-background/90 p-6 text-base leading-loose text-muted-foreground sm:p-8">
                {selected.content}
              </div>
              <button
                type="button"
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                onClick={() => {
                  readingRef.current?.focus({ preventScroll: true });
                  selectSection(null);
                }}
              >
                返回阅读首页
              </button>
            </div>
          ) : (
            <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2">
              {sections.filter(({ featured }) => featured).map(({ id, title, heading, description }) => (
                <button
                  key={id}
                  type="button"
                  className="flex flex-col items-start gap-4 border border-foreground/20 bg-background/90 p-6 text-left hover:border-foreground/40 hover:bg-background focus-visible:outline-offset-4 sm:p-8"
                  onClick={() => selectSection(id)}
                >
                  <span className="text-sm text-muted-foreground">{title}</span>
                  <span className="text-xl font-light tracking-tight sm:text-2xl">{heading}</span>
                  <span className="text-base leading-relaxed text-muted-foreground">{description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
