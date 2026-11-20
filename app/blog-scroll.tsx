"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { BlogCanopy } from "./blog-canopy";
import { BlogEntryRow } from "./blog-entry-row";
import { BlogIntro } from "./blog-intro";

type BlogCopy = {
  heading: string;
  paragraphs: string[];
};

type BlogSection = BlogCopy & {
  id: string;
  title: string;
  content: ReactNode;
  featured?: BlogCopy & { inlineContent?: boolean };
};

function ReadingCopy({
  heading,
  paragraphs,
  id,
  compact = false,
}: BlogCopy & { id?: string; compact?: boolean }) {
  return (
    <div className={compact ? "space-y-5" : "space-y-8 sm:space-y-12"}>
      <h2 id={id} className="text-3xl font-light leading-tight tracking-tight sm:text-5xl">
        {heading}
      </h2>
      <div className="space-y-4 text-base leading-loose text-muted-foreground sm:text-lg">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}

export function BlogScroll({
  overview,
  sections,
}: {
  overview: BlogCopy[];
  sections: BlogSection[];
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const readingRef = useRef<HTMLElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = sections.find(({ id }) => id === selectedId);
  const reading = selected ? [selected] : overview;

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
        aria-label="Main navigation"
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
        className={`blog-reading relative z-10 min-h-dvh px-8 text-foreground ${
          selected ? "pb-16 pt-10 sm:pt-16" : "pb-32 pt-[clamp(7rem,20svh,15rem)] sm:pb-48"
        }`}
      >
        <div className="mx-auto max-w-2xl">
          <div className="space-y-[clamp(12rem,38svh,30rem)]">
            {reading.map(({ heading, paragraphs }, index) => (
              <ReadingCopy
                key={heading}
                id={index === 0 ? "blog-reading-title" : undefined}
                heading={heading}
                paragraphs={paragraphs}
                compact={Boolean(selected)}
              />
            ))}

            {!selected && sections.map(({ id, title, heading, featured, content }) => {
              if (!featured) return null;

              const { inlineContent, ...copy } = featured;
              const headingId = `blog-featured-${id}`;
              const openSection = () => selectSection(id);

              return (
                <section key={id} aria-labelledby={headingId}>
                  <ReadingCopy id={headingId} {...copy} />
                  {inlineContent ? (
                    <div className="mt-6 text-base text-muted-foreground sm:text-lg">{content}</div>
                  ) : (
                    <>
                      <div className="mt-8">
                        <BlogEntryRow label={title} heading={heading} onSelect={openSection} />
                      </div>
                      <button
                        type="button"
                        aria-label={`See more ${copy.heading.toLowerCase()}`}
                        aria-controls="blog-selected-section"
                        className="mt-2 inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                        onClick={openSection}
                      >
                        See more
                      </button>
                    </>
                  )}
                </section>
              );
            })}
          </div>

          {selected && (
            <div className="mt-10 space-y-6">
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
                Back to overview
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
