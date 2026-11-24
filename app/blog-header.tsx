"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { collectionPath, getBlogCollections } from "@/lib/blog-content";
import { useBlogBackHistory } from "./blog-back-link";
import { BlogIntro, blogName } from "./blog-intro";
import { useBlogLanguage } from "./blog-language";

export function BlogHeader() {
  const { language, setLanguage } = useBlogLanguage();
  const chinese = language === "zh";
  const pathname = usePathname();
  useBlogBackHistory(pathname);
  const home = pathname === "/";
  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDialogElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    menu.close();
    const desktop = window.matchMedia("(min-width: 640px)");
    const onResize = () => {
      if (desktop.matches) menu.close();
    };
    desktop.addEventListener("change", onResize);
    return () => desktop.removeEventListener("change", onResize);
  }, [pathname]);

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
      header.toggleAttribute("data-docked", progress === 1);
      nav.toggleAttribute("data-visible", showNav);
    };

    syncHeader();
    const preventTextAction = (event: Event) => event.preventDefault();
    document.addEventListener("selectstart", preventTextAction);
    document.addEventListener("copy", preventTextAction);
    window.addEventListener("scroll", syncHeader, { passive: true });
    motion.addEventListener("change", syncHeader);
    return () => {
      document.removeEventListener("selectstart", preventTextAction);
      document.removeEventListener("copy", preventTextAction);
      window.removeEventListener("scroll", syncHeader);
      motion.removeEventListener("change", syncHeader);
      header.style.removeProperty("--home-intro-progress");
      header.removeAttribute("data-docked");
      nav.removeAttribute("data-visible");
    };
  }, [home]);

  const navigation = [
    ...getBlogCollections(language).map(collection => ({ title: collection.title, href: collectionPath(collection) })),
    { title: chinese ? "联系" : "Contact", href: "/#contact" },
  ];
  const links = navigation.map(({ href, title }) => (
    <Link
      key={href}
      href={href}
      aria-current={pathname.replace(/\/$/, "") === href.replace(/\/$/, "") ? "page" : undefined}
      onClick={() => menuRef.current?.close()}
      className="pointer-events-auto inline-flex min-h-11 items-center px-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:underline sm:px-3"
    >
      {title}
    </Link>
  ));
  const languageHint = chinese ? "当前语言为中文，点击切换到英文" : "Current language is English. Switch to Chinese.";
  const languageSwitch = (
    <button
      type="button"
      className="blog-language-switch"
      title={languageHint}
      aria-label={languageHint}
      onClick={() => setLanguage(chinese ? "en" : "zh")}
    >
      {chinese ? "中文" : "EN"}
    </button>
  );

  return (
    <header ref={headerRef} className="blog-header" data-home={home}>
      <BlogIntro home={home} />
      <nav
        ref={navRef}
        aria-label={chinese ? "主导航" : "Main navigation"}
        className="blog-section-nav fixed z-20 flex items-center justify-end gap-1 sm:gap-2"
      >
        <div className="blog-desktop-links hidden sm:flex sm:gap-2">{links}</div>
        <div className="hidden sm:block">{languageSwitch}</div>
        <button
          type="button"
          className="blog-menu-toggle pointer-events-auto sm:hidden"
          aria-label={chinese ? "打开菜单" : "Open menu"}
          aria-controls="blog-mobile-menu"
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          onClick={() => {
            menuRef.current?.showModal();
            setMenuOpen(true);
          }}
        >
          <span aria-hidden="true" className="blog-menu-icon" />
        </button>
      </nav>
      <dialog
        ref={menuRef}
        id="blog-mobile-menu"
        className="blog-mobile-menu"
        aria-label={chinese ? "网站菜单" : "Site menu"}
        onClose={() => setMenuOpen(false)}
      >
        <div className="blog-menu-bar">
          <Link href="/" aria-label={chinese ? `${blogName} 首页` : `${blogName} home`} onClick={() => menuRef.current?.close()}>
            <span lang="en">{blogName}</span>
          </Link>
          <div className="flex items-center gap-2">
            {languageSwitch}
            <button type="button" className="blog-menu-toggle blog-menu-close" aria-label={chinese ? "关闭菜单" : "Close menu"} onClick={() => menuRef.current?.close()}>
              <span aria-hidden="true" className="blog-menu-icon" />
            </button>
          </div>
        </div>
        <nav aria-label={chinese ? "网站栏目" : "Site sections"} className="blog-menu-links">{links}</nav>
      </dialog>
    </header>
  );
}
