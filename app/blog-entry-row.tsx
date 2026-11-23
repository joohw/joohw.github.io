"use client";

import Link from "next/link";
import { useRef } from "react";
import { measureEntryDestination, measureTitle } from "./blog-title-position";
import { useBlogTitleTransition } from "./blog-title-transition";

type BlogEntryRowProps = {
  label: string;
  heading: string;
  href: string;
};

export function BlogEntryRow({ label, heading, href }: BlogEntryRowProps) {
  const titleRef = useRef<HTMLSpanElement>(null);
  const start = useBlogTitleTransition();

  return (
    <Link
      href={href}
      className="grid min-h-32 w-full grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2 border border-foreground/20 bg-background/90 px-4 py-4 text-left hover:border-foreground/40 hover:bg-background focus-visible:outline-offset-4 sm:min-h-40 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4 sm:px-6"
      onClick={event => {
        const title = titleRef.current;
        if (!start || !title || event.defaultPrevented || event.button !== 0 ||
            event.ctrlKey || event.metaKey || event.shiftKey || event.altKey ||
            typeof title.animate !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const shell = title.closest<HTMLElement>("[data-blog-shell]");
        if (!shell) return;
        const from = measureTitle(title, true);
        const to = measureEntryDestination(shell, heading);
        if (start({ href, source: title, from, to })) event.preventDefault();
      }}
    >
      <span className="truncate text-sm text-muted-foreground">{label}</span>
      <span ref={titleRef} className="truncate text-base font-light tracking-tight sm:text-lg">{heading}</span>
    </Link>
  );
}
