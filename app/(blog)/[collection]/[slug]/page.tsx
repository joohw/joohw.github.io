import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogCollections, entryPath, findBlogCollection } from "@/lib/blog-content";
import { BlogContentView } from "../../../blog-content-view";

type EntryPageProps = {
  params: Promise<{ collection: string; slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return blogCollections.flatMap(collection => collection.entries.map(entry => ({
    collection: collection.slug,
    slug: entry.slug,
  })));
}

async function getEntry(params: EntryPageProps["params"]) {
  const { collection: collectionSlug, slug } = await params;
  const collection = findBlogCollection(collectionSlug);
  if (!collection) notFound();
  const entry = collection.entries.find(item => item.slug === slug);
  if (!entry) notFound();
  return { collection, entry };
}

export async function generateMetadata({ params }: EntryPageProps): Promise<Metadata> {
  const { collection, entry } = await getEntry(params);
  return {
    title: `${entry.heading} | Joo Hwang`,
    description: entry.description,
    alternates: { canonical: entryPath(collection, entry) },
  };
}

export default async function EntryPage({ params }: EntryPageProps) {
  const { collection, entry } = await getEntry(params);

  return <BlogContentView collectionSlug={collection.slug} entrySlug={entry.slug} />;
}
