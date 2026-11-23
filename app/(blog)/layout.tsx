import type { ReactNode } from "react";
import { blogCollections, collectionPath } from "@/lib/blog-content";
import { BlogCanopy } from "../blog-canopy";
import { BlogTitleTransition } from "../blog-title-transition";
import { BlogHeader } from "../blog-header";
import { BlogScrollbar } from "../blog-scrollbar";

const navigation = [
  ...blogCollections.map(collection => ({ title: collection.title, href: collectionPath(collection) })),
  { title: "Contact", href: "/#contact" },
];

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div id="blog-content" className="blog-scroll isolate min-h-dvh text-foreground" data-blog-shell="">
        <BlogTitleTransition>
          <BlogCanopy />
          <BlogHeader navigation={navigation} />
          {children}
        </BlogTitleTransition>
      </div>
      <BlogScrollbar />
    </>
  );
}
