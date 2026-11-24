import { getProjectLinks, type BlogLanguage } from "@/lib/blog-content";

export function BlogProjectLinks({ language }: { language: BlogLanguage }) {
  return (
    <ul className="space-y-6">
      {getProjectLinks(language).map(project => (
        <li key={project.name}>
          <a
            href={project.href}
            target="_blank"
            rel="noopener"
            className="inline-flex min-h-11 items-center gap-2 text-xl underline decoration-foreground/40 underline-offset-4 hover:decoration-current sm:text-2xl"
          >
            {project.name}<span aria-hidden="true" className="text-base">↗</span>
          </a>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">{project.description}</p>
        </li>
      ))}
    </ul>
  );
}
