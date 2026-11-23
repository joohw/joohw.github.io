export type BlogCopy = {
  heading: string;
  paragraphs: string[];
};

type BlogEntry = BlogCopy & {
  slug: string;
  description: string;
};

type BlogCollection = BlogCopy & {
  slug: "projects" | "articles";
  title: string;
  entries: BlogEntry[];
};

export const blogCollections: BlogCollection[] = [
  {
    slug: "projects",
    title: "Projects",
    heading: "Projects",
    paragraphs: [
      "This is where I share the digital products and browser experiments I design and build. Alongside the work itself, I share the idea I wanted to test and how it took shape in the browser.",
      "The site you're reading is one of those projects. I wanted the opening to feel like an illustration and used the first stretch of scrolling to bring the navigation and reading area into view.",
    ],
    entries: [
      {
        slug: "personal-site",
        heading: "Designing a personal site around scrolling",
        description: "Deep-blue foliage frames the introduction and the reading area. Scroll down to reveal the navigation in the upper-right corner.",
        paragraphs: [
          "The opening screen shows my name and a short introduction. As you scroll, they move to the upper-left corner and links to each section appear on the right.",
          "Keep scrolling and the main content comes into view from below. The branches stay still while the leaf tips sway in a light breeze.",
        ],
      },
    ],
  },
  {
    slug: "articles",
    title: "Writing",
    heading: "Writings",
    paragraphs: [
      "I write about product design and development through the details I encounter while building. I like to trace a choice from the effect I wanted on screen to the code that made it possible.",
      "In one piece, I explain how I recreated the hand-drawn hatching from my old portfolio in Canvas. Small changes in stroke angle and spacing gave it variation, and a fixed random seed kept the pattern consistent between visits at the same canvas size.",
    ],
    entries: [
      {
        slug: "hand-drawn-hatching",
        heading: "Bringing hand-drawn hatching to the browser",
        description: "In an earlier version of this site, I used Canvas to recreate the hand-drawn hatching from my old portfolio.",
        paragraphs: [
          "I grouped the strokes into vertical columns and varied their angles, spacing, and breaks. A fixed random seed kept the texture identical each time the page loaded at the same canvas size.",
          "As you scrolled into the reading area, the site reused the rendered texture, moving the columns in different directions and at different speeds. Once the motion stopped, the hatching stayed in place as the background.",
        ],
      },
    ],
  },
];

export function findBlogCollection(slug: string) {
  return blogCollections.find(collection => collection.slug === slug);
}

export function collectionPath(collection: BlogCollection) {
  return `/${collection.slug}/`;
}

export function entryPath(collection: BlogCollection, entry: BlogEntry) {
  return `${collectionPath(collection)}${entry.slug}/`;
}
