"use client";

import { entryPath, findBlogCollection } from "@/lib/blog-content";
import { BlogEntryRow } from "./blog-entry-row";
import { useBlogLanguage } from "./blog-language";
import { BlogResourcePage } from "./blog-resource-page";
import { BlogProjectLinks } from "./blog-project-links";

export function BlogContentView({ collectionSlug, entrySlug }: { collectionSlug: string; entrySlug?: string }) {
  const { language } = useBlogLanguage();
  const collection = findBlogCollection(collectionSlug, language);
  if (!collection) return null;

  if (entrySlug) {
    const entry = collection.entries.find(item => item.slug === entrySlug);
    if (!entry) return null;

    return (
      <BlogResourcePage heading={entry.heading} entryHref={entryPath(collection, entry)}>
        <div className="space-y-4 text-base leading-loose text-muted-foreground sm:text-lg">
          <p>{entry.description}</p>
          {entry.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </BlogResourcePage>
    );
  }

  if (collection.slug === "projects") {
    return (
      <BlogResourcePage heading={collection.title}>
        <BlogProjectLinks language={language} />
      </BlogResourcePage>
    );
  }

  return (
    <BlogResourcePage heading={collection.title}>
      <div className="space-y-4 text-base leading-loose text-muted-foreground sm:text-lg">
        {collection.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      </div>
      <ul className="mt-10 space-y-4">
        {collection.entries.map(entry => (
          <li key={entry.slug}>
            <BlogEntryRow label={collection.title} heading={entry.heading} href={entryPath(collection, entry)} />
          </li>
        ))}
      </ul>
    </BlogResourcePage>
  );
}
