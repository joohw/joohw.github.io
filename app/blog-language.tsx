"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { blogSiteMetadata, findBlogCollection, type BlogLanguage } from "@/lib/blog-content";

const storageKey = "blog-language";
const LanguageContext = createContext<{
  language: BlogLanguage;
  setLanguage: (value: BlogLanguage) => void;
} | null>(null);

export function useBlogLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("Blog language is only available inside BlogLanguageProvider.");
  return context;
}

export function BlogLanguageProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [language, updateLanguage] = useState<BlogLanguage>("en");

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === "zh") updateLanguage("zh");
    } catch { /* Storage may be unavailable in private browsing. */ }
    const syncPreference = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) updateLanguage(event.newValue === "zh" ? "zh" : "en");
    };
    window.addEventListener("storage", syncPreference);
    return () => window.removeEventListener("storage", syncPreference);
  }, []);

  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    return () => { document.documentElement.lang = previous; };
  }, [language]);

  useEffect(() => {
    const [collectionSlug, entrySlug] = pathname.split("/").filter(Boolean);
    const collection = findBlogCollection(collectionSlug, language);
    const entry = collection?.entries.find(item => item.slug === entrySlug);
    if ((collectionSlug && !collection) || (entrySlug && !entry)) return;
    const site = blogSiteMetadata[language];
    const pageTitle = entry?.heading ?? collection?.title;
    const title = pageTitle ? `${pageTitle} | Joo Hwang` : site.title;
    const description = entry?.description ?? collection?.paragraphs[0] ?? site.description;
    const syncMetadata = () => {
      if (document.title !== title) document.title = title;
      const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (meta && meta.content !== description) meta.content = description;
    };
    syncMetadata();
    // The App Router can stream the static English metadata after hydration.
    if (language === "en") return;
    const observer = new MutationObserver(syncMetadata);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["content"] });
    return () => observer.disconnect();
  }, [pathname, language]);

  const setLanguage = (value: BlogLanguage) => {
    updateLanguage(value);
    try {
      localStorage.setItem(storageKey, value);
    } catch { /* The selection still applies to the current visit. */ }
  };

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}
