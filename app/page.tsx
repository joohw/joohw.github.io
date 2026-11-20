import { BlogScroll } from "./blog-scroll";

const email = (
  <a
    className="underline underline-offset-4 hover:text-foreground"
    href="mailto:sungizhow@gmail.com"
  >
    sungizhow@gmail.com
  </a>
);

const contactParagraphs = [
  "If you have a question about a project or a thought about something I've written, I'd love to hear from you.",
  "Tell me which project or post caught your attention and what made you curious. I'd also like to hear how you've approached similar problems in your own work.",
];

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
  {
    id: "projects",
    title: "Projects",
    heading: "Designing a personal site around scrolling",
    paragraphs: [
      "Deep-blue foliage frames the introduction and the reading area. Scroll down to reveal the navigation in the upper-right corner.",
    ],
    featured: {
      heading: "Projects",
      paragraphs: [
        "This is where I share the digital products and browser experiments I design and build. Alongside the work itself, I share the idea I wanted to test and how it took shape in the browser.",
        "The site you're reading is one of those projects. I wanted the opening to feel like an illustration and used the first stretch of scrolling to bring the navigation and reading area into view.",
      ],
    },
    content: (
      <>
        <p>
          The opening screen shows my name and a short introduction. As you scroll, they move to the upper-left corner and links to each section appear on the right.
        </p>
        <p>
          Keep scrolling and the main content comes into view from below. The branches stay still while the leaf tips sway in a light breeze.
        </p>
      </>
    ),
  },
  {
    id: "writing",
    title: "Writing",
    heading: "Bringing hand-drawn hatching to the browser",
    paragraphs: [
      "In an earlier version of this site, I used Canvas to recreate the hand-drawn hatching from my old portfolio.",
    ],
    featured: {
      heading: "Writings",
      paragraphs: [
        "I write about product design and development through the details I encounter while building. I like to trace a choice from the effect I wanted on screen to the code that made it possible.",
        "In one piece, I explain how I recreated the hand-drawn hatching from my old portfolio in Canvas. Small changes in stroke angle and spacing gave it variation, and a fixed random seed kept the pattern consistent between visits at the same canvas size.",
      ],
    },
    content: (
      <>
        <p>
          I grouped the strokes into vertical columns and varied their angles, spacing, and breaks. A fixed random seed kept the texture identical each time the page loaded at the same canvas size.
        </p>
        <p>
          As you scrolled into the reading area, the site reused the rendered texture, moving the columns in different directions and at different speeds. Once the motion stopped, the hatching stayed in place as the background.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    heading: "Send me an email",
    paragraphs: contactParagraphs,
    featured: {
      heading: "Contact me",
      paragraphs: contactParagraphs,
      inlineContent: true,
    },
    content: email,
  },
];

export default function Home() {
  return <BlogScroll overview={overview} sections={sections} />;
}
