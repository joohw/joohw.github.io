"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useBlogBackHistory } from "./blog-back-link";
import { BlogIntro } from "./blog-intro";

export function BlogHeader({ navigation }: { navigation: { title: string; href: string }[] }) {
  const pathname = usePathname();
  useBlogBackHistory(pathname);
  const home = pathname === "/";
  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    const nav = navRef.current;
    if (!home || !header || !nav) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncHeader = () => {
      const scrollTop = Math.max(0, window.scrollY);
      const showNav = scrollTop >= 64;
      const progress = motion.matches ? Number(showNav) : Math.min(scrollTop / 200, 1);
      header.style.setProperty("--home-intro-progress", String(progress));
      nav.toggleAttribute("data-visible", showNav);
    };

    syncHeader();
    window.addEventListener("scroll", syncHeader, { passive: true });
    motion.addEventListener("change", syncHeader);
    return () => {
      window.removeEventListener("scroll", syncHeader);
      motion.removeEventListener("change", syncHeader);
      header.style.removeProperty("--home-intro-progress");
      nav.removeAttribute("data-visible");
    };
  }, [home]);

  return (
    <header ref={headerRef} className="blog-header" data-home={home}>
      <BlogIntro home={home} />
      <nav
        ref={navRef}
        aria-label="Main navigation"
        className="blog-section-nav fixed z-20 flex flex-wrap justify-end gap-1 sm:gap-2"
      >
        {navigation.map(({ href, title }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className="pointer-events-auto inline-flex min-h-11 items-center px-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:underline sm:px-3"
          >
            {title}
          </Link>
        ))}
      </nav>
    </header>
  );
}
