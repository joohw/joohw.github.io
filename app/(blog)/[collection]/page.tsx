import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogCollections, collectionPath, findBlogCollection } from "@/lib/blog-content";
import { BlogContentView } from "../../blog-content-view";

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

  return <BlogContentView collectionSlug={collection.slug} />;
}
