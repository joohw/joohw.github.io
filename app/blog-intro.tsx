"use client";

import { useEffect, useState } from "react";

const blogName = "Joo Hwang";
const blogTagline = "Bon Vivant, Designer, Coder";

function AnimatedText({
  text,
  startDelay = 0,
  letterDelay,
}: {
  text: string;
  startDelay?: number;
  letterDelay: number;
}) {
  const groups = text.match(/ +|[^ ]+/g) ?? [];
  let letterIndex = 0;

  return (
    <>
      <span className="sr-only select-none">{text}</span>
      <span aria-hidden="true">
        {groups.map((group, groupIndex) =>
          group.startsWith(" ") ? (
            group
          ) : (
            <span key={groupIndex} className="inline-block">
              {Array.from(group, (letter, index) => (
                <span
                  key={index}
                  className="intro-letter"
                  style={{ animationDelay: `${startDelay + letterIndex++ * letterDelay}ms` }}
                >
                  {letter}
                </span>
              ))}
            </span>
          ),
        )}
      </span>
    </>
  );
}

export function BlogIntro() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const revealIntro = () => {
      void document.fonts.ready.then(() => {
        if (active) setReady(true);
      });
    };

    if (document.readyState === "complete") revealIntro();
    else window.addEventListener("load", revealIntro, { once: true });

    return () => {
      active = false;
      window.removeEventListener("load", revealIntro);
    };
  }, []);

  return (
    <div className="blog-intro text-center" data-ready={ready}>
      <h1 className="font-extralight leading-none tracking-tight">
        <AnimatedText text={blogName} letterDelay={65} />
      </h1>
      <p className="leading-relaxed text-muted-foreground">
        <AnimatedText text={blogTagline} startDelay={510} letterDelay={28} />
      </p>
    </div>
  );
}
