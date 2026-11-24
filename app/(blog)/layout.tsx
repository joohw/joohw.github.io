import type { ReactNode } from "react";
import { BlogCanopy } from "../blog-canopy";
import { BlogTitleTransition } from "../blog-title-transition";
import { BlogHeader } from "../blog-header";
import { BlogScrollbar } from "../blog-scrollbar";
import { BlogLanguageProvider } from "../blog-language";

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <BlogLanguageProvider>
      <div id="blog-content" className="blog-scroll isolate min-h-dvh text-foreground" data-blog-shell="">
        <BlogTitleTransition>
          <BlogCanopy />
          <BlogHeader />
          {children}
        </BlogTitleTransition>
      </div>
      <BlogScrollbar />
    </BlogLanguageProvider>
  );
}
