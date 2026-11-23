import type { Metadata } from "next";
import { blogCollections, collectionPath, entryPath } from "@/lib/blog-content";
import { BlogScroll } from "../blog-scroll";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const overview = [
  {
    heading: "About me",
    paragraphs: [
      "I'm Joo Hwang, an independent designer and full-stack engineer. I build digital products from the first sketch through launch.",
      "Working across design and code lets me test an idea in the browser while it's still taking shape. I can sketch a layout, build enough of it to try on a phone, and use what I see to decide what to change next.",
    ],
  },
  {
    heading: "Why blog",
    paragraphs: [
      "I started this blog to keep track of how my projects change while I'm building them. By the time something ships, it's easy to forget which ideas I tried first and what made me change direction.",
      "I'll share early prototypes, explain the trade-offs behind decisions, and revisit them after launch. Writing those details down gives me something concrete to look back on when I run into a similar problem again.",
    ],
  },
];

const sections = [
  ...blogCollections.map(collection => ({
    id: collection.slug,
    title: collection.title,
    heading: collection.heading,
    paragraphs: collection.paragraphs,
    href: collectionPath(collection),
    entries: collection.entries.slice(0, 1).map(entry => ({
      heading: entry.heading,
      href: entryPath(collection, entry),
    })),
  })),
  {
    id: "contact",
    title: "Contact",
    heading: "Contact me",
    href: "#contact",
    paragraphs: [
      "If you have a question about a project or a thought about something I've written, I'd love to hear from you.",
      "Tell me which project or post caught your attention and what made you curious. I'd also like to hear how you've approached similar problems in your own work.",
    ],
    content: (
      <a
        className="underline underline-offset-4 hover:text-foreground"
        href="mailto:sungizhow@gmail.com"
      >
        sungizhow@gmail.com
      </a>
    ),
  },
];

export default function Home() {
  return <BlogScroll overview={overview} sections={sections} />;
}
