export type TitlePosition = {
  letters: { character: string; rect: DOMRect }[];
  fontSize: number;
  ink: Partial<CSSStyleDeclaration>;
  clipRight: number;
};

export function measureTitleLetters(title: HTMLElement): TitlePosition["letters"] {
  const text = title.firstChild;
  const letters: TitlePosition["letters"] = [];

  if (text instanceof Text) {
    const range = document.createRange();
    let offset = 0;
    for (const character of text.data) {
      const end = offset + character.length;
      if (character.trim()) {
        range.setStart(text, offset);
        range.setEnd(text, end);
        letters.push({ character, rect: range.getBoundingClientRect() });
      }
      offset = end;
    }
  }
  return letters;
}

export function measureTitle(title: HTMLElement, clip = false): TitlePosition {
  const style = getComputedStyle(title);
  const fontSize = parseFloat(style.fontSize);
  const bounds = title.getBoundingClientRect();
  const clipRight = clip && title.scrollWidth > title.clientWidth ? bounds.right - fontSize * 0.8 : Infinity;
  return {
    letters: measureTitleLetters(title),
    fontSize,
    clipRight,
    ink: {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      fontStyle: style.fontStyle,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      color: style.color,
      textShadow: style.textShadow,
    },
  };
}

export function measureEntryDestination(shell: HTMLElement, text: string) {
  const probe = document.createElement("div");
  probe.className = "blog-title-probe";
  probe.setAttribute("aria-hidden", "true");
  const content = document.createElement("div");
  content.className = "blog-resource-content";
  const back = document.createElement("span");
  back.className = "blog-resource-back";
  back.textContent = "Back";
  const title = document.createElement("h1");
  title.className = "blog-resource-title";
  title.textContent = text;
  content.append(back, title);
  probe.append(content);
  shell.append(probe);
  const position = measureTitle(title);
  probe.remove();
  return position;
}
