"use client";

import Link from "next/link";
import { entryPath, findBlogCollection, type BlogCopy } from "@/lib/blog-content";
import { blogHomeCopy, lamportInterview } from "@/lib/blog-home-copy";
import { BlogProjectLinks } from "./blog-project-links";
import { useBlogLanguage } from "./blog-language";

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

export function BlogScroll() {
  const { language } = useBlogLanguage();
  const { about, writing, articleList, contact, rednote } = blogHomeCopy[language];
  const articles = findBlogCollection("articles", language);
  const projects = findBlogCollection("projects", language);
  const textLink = "underline decoration-foreground/40 underline-offset-4 hover:text-foreground hover:decoration-current";

  return (
    <main>
      <div aria-hidden="true" className="min-h-dvh" />

      <section
        aria-labelledby="blog-reading-title"
        className="blog-reading relative z-10 min-h-dvh px-8 pb-32 pt-[clamp(7rem,20svh,15rem)] text-foreground sm:pb-48"
      >
        <div className="mx-auto max-w-2xl space-y-[clamp(12rem,38svh,30rem)]">
          <ReadingCopy id="blog-reading-title" {...about} />
          <section aria-labelledby="why-write" className="space-y-8 sm:space-y-12">
            <h2 id="why-write" className="text-3xl font-light leading-tight sm:text-5xl">{writing.heading}</h2>
            <div className="space-y-5 text-base leading-loose text-muted-foreground sm:text-lg">
              <p>{writing.intro}</p>
              <figure>
                <blockquote cite={lamportInterview} className="text-foreground">“{writing.quote}”</blockquote>
                <figcaption className="mt-1 text-sm"><a href={lamportInterview} className={textLink}>{writing.credit}</a></figcaption>
              </figure>
              <div>
                <p>{writing.plans}</p>
                {articles && (
                  <ul id="articles" aria-label={articleList} className="blog-reading mt-2 space-y-2 leading-relaxed">
                    {articles.entries.map(entry => (
                      <li key={entry.slug}>
                        <Link className={`inline-flex min-h-11 items-center ${textLink}`} href={entryPath(articles, entry)}>
                          {entry.heading}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
          {projects && (
            <section id={projects.slug} aria-labelledby="blog-featured-projects" className="blog-reading space-y-8 sm:space-y-12">
              <h2 id="blog-featured-projects" className="text-3xl font-light leading-tight sm:text-5xl">{projects.heading}</h2>
              <BlogProjectLinks language={language} />
            </section>
          )}
          <section id="contact" aria-labelledby="blog-featured-contact" className="blog-reading">
            <h2 id="blog-featured-contact" className="text-3xl font-light leading-tight sm:text-5xl">{contact}</h2>
            <ul className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-base text-muted-foreground sm:text-lg">
              <li><a className={textLink} href="https://www.xiaohongshu.com/user/profile/662a4388000000001701e259">{rednote}</a></li>
              <li><a className={textLink} href="mailto:sungizhow@gmail.com">sungizhow@gmail.com</a></li>
              <li><a className={textLink} href="https://x.com/joowhwang">X (@joowhwang)</a></li>
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}
