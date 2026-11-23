import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogCollections, collectionPath, entryPath, findBlogCollection } from "@/lib/blog-content";
import { BlogEntryRow } from "../../blog-entry-row";
import { BlogResourcePage } from "../../blog-resource-page";

type CollectionPageProps = {
  params: Promise<{ collection: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return blogCollections.map(({ slug }) => ({ collection: slug }));
}

async function getCollection(params: CollectionPageProps["params"]) {
  const collection = findBlogCollection((await params).collection);
  if (!collection) notFound();
  return collection;
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const collection = await getCollection(params);
  return {
    title: `${collection.title} | Joo Hwang`,
    description: collection.paragraphs[0],
    alternates: { canonical: collectionPath(collection) },
  };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const collection = await getCollection(params);

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
