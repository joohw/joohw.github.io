"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useBlogLanguage } from "./blog-language";

export function useBlogBackHistory(pathname: string) {
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    const state = window.history.state;
    if (state?.blogBack?.pathname !== pathname) {
      const referrer = document.referrer;
      const hasLocalReferrer = referrer.startsWith(`${window.location.origin}/`) &&
        new URL(referrer).pathname !== pathname;

      // Mark this entry so revisiting it through the browser history preserves its original backlink.
      window.history.replaceState({
        ...state,
        blogBack: { pathname, hasPreviousPage: previousPath.current !== null || hasLocalReferrer },
      }, "");
    }
    previousPath.current = pathname;
  }, [pathname]);
}

export function BlogBackLink({ className }: { className: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useBlogLanguage();

  return (
    <Link
      href="/"
      replace
      className={className}
      onNavigate={event => {
        const previous = window.history.state?.blogBack;
        if (window.history.length > 1 && previous?.pathname === pathname && previous.hasPreviousPage) {
          event.preventDefault();
          router.back();
        }
      }}
    >
      {language === "zh" ? "返回" : "Back"}
    </Link>
  );
}
