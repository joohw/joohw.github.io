import type { ReactNode } from "react";
import { BlogBackLink } from "./blog-back-link";

export function BlogResourcePage({
  heading,
  entryHref,
  children,
}: {
  heading: string;
  entryHref?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-dvh">
      <div className="blog-reading blog-resource-content">
        <BlogBackLink className="blog-resource-back" />
        <h1 className="blog-resource-title" data-entry-title={entryHref}>{heading}</h1>
        {children}
      </div>
    </main>
  );
}
