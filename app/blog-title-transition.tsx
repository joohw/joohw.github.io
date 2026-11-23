"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef } from "react";
import { measureTitle, measureTitleLetters, type TitlePosition } from "./blog-title-position";

type FlightRequest = {
  href: string;
  source: HTMLElement;
  from: TitlePosition;
  to: TitlePosition;
};

type Letter = {
  element: HTMLSpanElement;
  ink: DOMRect;
  finish: { x: number; y: number; scale: number };
};

type Flight = {
  source: HTMLElement;
  shell: HTMLElement;
  fromPath: string;
  href: string;
  fontSize: number;
  letters: Letter[];
  animations: Animation[];
  navTimer: number;
  deadline: number;
  navigating: boolean;
  arrived: boolean;
  settled: boolean;
  heading?: HTMLElement;
};

const TitleFlightContext = createContext<((request: FlightRequest) => boolean) | null>(null);
export const useBlogTitleTransition = () => useContext(TitleFlightContext);

const pose = ({ x, y, scale }: Letter["finish"]) => `translate(${x}px, ${y}px) scale(${scale})`;

function align(rect: DOMRect, ink: DOMRect, scale: number): Letter["finish"] {
  return { x: rect.left - ink.left * scale, y: rect.top - ink.top * scale, scale };
}

export function BlogTitleTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const layerRef = useRef<HTMLDivElement>(null);
  const active = useRef<Flight | null>(null);

  const reveal = useCallback((flight: Flight) => {
    if (active.current !== flight) return;
    active.current = null;
    window.clearTimeout(flight.navTimer);
    window.clearTimeout(flight.deadline);
    for (const animation of flight.animations) animation.cancel();
    flight.source.removeAttribute("data-title-leaving");
    flight.shell.removeAttribute("data-title-flight");
    layerRef.current?.replaceChildren();
  }, []);

  const handoff = useCallback((flight: Flight) => {
    if (active.current !== flight || !flight.arrived || !flight.heading || flight.settled) return;
    flight.settled = true;
    const destination = measureTitle(flight.heading);
    if (destination.letters.length !== flight.letters.length) {
      reveal(flight);
      return;
    }

    const scale = destination.fontSize / flight.fontSize;
    const targets = flight.letters.map((letter, index) => align(destination.letters[index].rect, letter.ink, scale));
    const needsCorrection = flight.letters.some(({ finish }, index) => {
      const end = targets[index];
      return Math.hypot(end.x - finish.x, end.y - finish.y) > 0.75 || Math.abs(end.scale - finish.scale) > 0.01;
    });
    if (!needsCorrection) {
      reveal(flight);
      return;
    }

    const corrections = flight.letters.map(({ element, finish }, index) => element.animate([
      { transform: pose(finish) },
      { transform: pose(targets[index]) },
    ], { duration: 130, easing: "ease-out", fill: "both" }));
    flight.animations.push(...corrections);
    void Promise.allSettled(corrections.map(animation => animation.finished)).then(() => reveal(flight));
  }, [reveal]);

  useEffect(() => {
    const flight = active.current;
    if (!flight) return;
    if (pathname !== flight.href) {
      if (pathname !== flight.fromPath) reveal(flight);
      return;
    }

    const frame = requestAnimationFrame(() => {
      if (active.current !== flight) return;
      flight.heading = [...flight.shell.querySelectorAll<HTMLElement>("[data-entry-title]")]
        .find(heading => heading.dataset.entryTitle === flight.href);
      if (flight.heading) handoff(flight);
      else reveal(flight);
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, handoff, reveal]);

  useEffect(() => {
    const settle = () => {
      const flight = active.current;
      if (!flight) return;
      reveal(flight);
      if (!flight.navigating) router.push(flight.href);
    };
    window.addEventListener("resize", settle);
    return () => {
      window.removeEventListener("resize", settle);
      const flight = active.current;
      if (flight) reveal(flight);
    };
  }, [router, reveal]);

  const start = ({ href, source, from, to }: FlightRequest) => {
    if (active.current) return true;
    const shell = source.closest<HTMLElement>("[data-blog-shell]");
    const layer = layerRef.current;
    if (!shell || !layer || !from.letters.length || from.letters.length !== to.letters.length) return false;

    const elements = from.letters.map(({ character }) => {
      const element = document.createElement("span");
      element.className = "blog-title-letter";
      element.textContent = character;
      Object.assign(element.style, from.ink);
      return element;
    });
    layer.replaceChildren(...elements);

    const scale = to.fontSize / from.fontSize;
    // Read every glyph before adding transforms, so the unanimated ink origin stays stable.
    const letters = elements.map((element, index) => {
      const ink = measureTitleLetters(element)[0].rect;
      return { element, ink, finish: align(to.letters[index].rect, ink, scale) };
    });

    const animations = letters.map(({ element, ink, finish }, index) => {
      const { rect } = from.letters[index];
      const first = align(rect, ink, 1);
      first.x = Math.min(first.x, from.clipRight - ink.left);
      const visible = rect.right <= from.clipRight;
      const middle = {
        x: first.x + (finish.x - first.x) * 0.3,
        y: first.y + (finish.y - first.y) * 0.3 + 3 * Math.sin(index),
        scale: 1 + (scale - 1) * 0.3,
      };
      return element.animate([
        { transform: pose(first), opacity: visible ? 1 : 0, filter: "blur(0px)" },
        { transform: pose(middle), opacity: visible ? 0.56 : 0.35, filter: "blur(2px)", offset: 0.42 },
        { transform: pose(finish), opacity: 1, filter: "blur(0px)" },
      ], {
        duration: 560,
        delay: Math.min(110, index * 5),
        easing: "cubic-bezier(0.24, 0.54, 0.26, 1)",
        fill: "both",
      });
    });
    const flight: Flight = {
      source, shell, href, fromPath: pathname, letters, animations, fontSize: from.fontSize,
      navTimer: 0, deadline: 0, navigating: false, arrived: false, settled: false,
    };
    active.current = flight;
    source.setAttribute("data-title-leaving", "");
    shell.setAttribute("data-title-flight", href);

    flight.navTimer = window.setTimeout(() => {
      flight.navigating = true;
      router.push(href);
    }, 115);
    flight.deadline = window.setTimeout(() => reveal(flight), 8000);
    void Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      flight.arrived = true;
      handoff(flight);
    });
    return true;
  };

  return (
    <TitleFlightContext.Provider value={start}>
      {children}
      <div ref={layerRef} className="blog-title-layer" aria-hidden="true" />
    </TitleFlightContext.Provider>
  );
}
