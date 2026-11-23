import Link from "next/link";
import type { ReactNode } from "react";
import type { BlogCopy } from "@/lib/blog-content";
import { BlogEntryRow } from "./blog-entry-row";

type BlogSection = BlogCopy & {
  id: string;
  title: string;
  href: string;
  entries?: { heading: string; href: string }[];
  content?: ReactNode;
};

function ReadingCopy({ heading, paragraphs, id }: BlogCopy & { id?: string }) {
  return (
    <div className="space-y-8 sm:space-y-12">
      <h2 id={id} className="text-3xl font-light leading-tight tracking-tight sm:text-5xl">
        {heading}
      </h2>
      <div className="space-y-4 text-base leading-loose text-muted-foreground sm:text-lg">
        {paragraphs.map(paragraph => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}

export function BlogScroll({
  overview,
  sections,
}: {
  overview: BlogCopy[];
  sections: BlogSection[];
}) {
  return (
    <main>
      <div aria-hidden="true" className="min-h-dvh" />

      <section
        aria-labelledby="blog-reading-title"
        className="blog-reading relative z-10 min-h-dvh px-8 pb-32 pt-[clamp(7rem,20svh,15rem)] text-foreground sm:pb-48"
      >
        <div className="mx-auto max-w-2xl space-y-[clamp(12rem,38svh,30rem)]">
          {overview.map(({ heading, paragraphs }, index) => (
            <ReadingCopy
              key={heading}
              id={index === 0 ? "blog-reading-title" : undefined}
              heading={heading}
              paragraphs={paragraphs}
            />
          ))}

          {sections.map(({ id, title, heading, paragraphs, href, entries, content }) => {
            const headingId = `blog-featured-${id}`;

            return (
              <section key={id} id={id} aria-labelledby={headingId} className="blog-reading">
                <ReadingCopy id={headingId} heading={heading} paragraphs={paragraphs} />
                {content && <div className="mt-6 text-base text-muted-foreground sm:text-lg">{content}</div>}
                {entries && (
                  <>
                    <div className="mt-8 space-y-4">
                      {entries.map(entry => (
                        <BlogEntryRow key={entry.href} label={title} heading={entry.heading} href={entry.href} />
                      ))}
                    </div>
                    <Link
                      href={href}
                      aria-label={`See more ${heading.toLowerCase()}`}
                      className="mt-2 inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:underline"
                    >
                      See more
                    </Link>
                  </>
                )}
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
