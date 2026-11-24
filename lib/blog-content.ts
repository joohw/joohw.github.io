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

export type BlogLanguage = "en" | "zh";
type Localized<T> = Record<BlogLanguage, T>;

export function getProjectLinks(language: BlogLanguage) {
  return [
    {
      name: "Noolingo",
      href: `https://noolingo.com/${language}`,
      description: language === "zh"
        ? "把笔记变成闪卡，用间隔重复安排复习。"
        : "Turn notes into flashcards and review them with spaced repetition.",
    },
    {
      name: "boss-cli",
      href: "https://boss-cli.com/",
      description: language === "zh"
        ? "在命令行里查看 BOSS 直聘职位、管理候选人和回复消息。"
        : "View job listings, manage candidates, and reply to messages on BOSS Zhipin from the command line.",
    },
    {
      name: "xhs-cli",
      href: "https://xhs-cli.com/",
      description: language === "zh"
        ? "在命令行里切换小红书账号、查看笔记数据，把图文草稿填入创作后台。"
        : "Switch Xiaohongshu accounts, check post analytics, and prepare drafts with images from the command line.",
    },
    {
      name: "html2link",
      href: `https://html2link.dev/${language}`,
      description: language === "zh"
        ? "把 HTML、静态网站或文档变成可分享的链接，在浏览器里直接预览。"
        : "Share an HTML file, a static site, or a document as a link that opens directly in the browser.",
    },
    {
      name: "AGIDaily",
      href: "https://www.agidaily.cc/",
      description: language === "zh"
        ? "每天用中文梳理 AI 领域值得关注的论文、模型发布和产品动态。"
        : "A daily digest in Chinese covering AI research papers, model releases, and product news.",
    },
  ];
}

export const blogSiteMetadata = {
  en: { title: "Joo Hwang's Blog", description: "A minimalist personal blog by Joo Hwang." },
  zh: { title: "Joo Hwang 的博客", description: "Joo Hwang 的个人博客，记录设计、开发与创作。" },
} satisfies Localized<{ title: string; description: string }>;

const collections: {
  slug: BlogCollection["slug"];
  copy: Localized<BlogCopy & { title: string }>;
  entries: { slug: string; copy: Localized<BlogCopy & { description: string }> }[];
}[] = [
  {
    slug: "projects",
    copy: {
      en: {
        title: "Projects",
        heading: "Projects",
        paragraphs: ["Explore Noolingo, boss-cli, xhs-cli, html2link, and AGIDaily."],
      },
      zh: {
        title: "项目",
        heading: "项目",
        paragraphs: ["我做的项目有 Noolingo、boss-cli、xhs-cli、html2link 和 AGIDaily。"],
      },
    },
    entries: [
      {
        slug: "personal-site",
        copy: {
          en: {
            heading: "Designing a personal site around scrolling",
            description: "Deep-blue foliage frames the introduction and the reading area. Scroll down to reveal the navigation in the upper-right corner.",
            paragraphs: [
              "The opening screen shows my name and a short introduction. As you scroll, they move to the upper-left corner and links to each section appear on the right.",
              "Keep scrolling and the main content comes into view from below. The branches stay still while the leaf tips sway in a light breeze.",
            ],
          },
          zh: {
            heading: "用滚动串起一个个人网站",
            description: "深蓝色的枝叶环绕着自我介绍和正文。向下滚动，导航就会出现在右上角。",
            paragraphs: [
              "打开网站时，画面中央是我的名字和一句简短的自我介绍。随着页面向下滚动，它们移到左上角，各个栏目的链接则出现在右侧。",
              "继续往下，正文从画面下方进入视野。树枝静静地留在原处，叶尖随着微风轻轻摆动。",
            ],
          },
        },
      },
    ],
  },
  {
    slug: "articles",
    copy: {
      en: {
        title: "Writing",
        heading: "Writings",
        paragraphs: [
          "I write about product design and development through the details I encounter while building. I like to trace a choice from the effect I wanted on screen to the code that made it possible.",
          "In one piece, I explain how I recreated the hand-drawn hatching from my old portfolio in Canvas. Small changes in stroke angle and spacing gave it variation, and a fixed random seed kept the pattern consistent between visits at the same canvas size.",
        ],
      },
      zh: {
        title: "文章",
        heading: "文章",
        paragraphs: [
          "我从做东西时遇到的小细节写起，聊聊产品设计和开发。我喜欢顺着一次设计选择往下写，从最初想在屏幕上看到的效果，一直写到让它成形的代码。",
          "我在一篇文章里写过，怎样用 Canvas 重现旧作品集里的手绘排线。让笔画的角度和间距稍有变化，纹理就多了些手绘的味道。固定随机种子后，只要画布尺寸相同，再次打开也能看到同一组线条。",
        ],
      },
    },
    entries: [
      {
        slug: "hand-drawn-hatching",
        copy: {
          en: {
            heading: "Bringing hand-drawn hatching to the browser",
            description: "In an earlier version of this site, I used Canvas to recreate the hand-drawn hatching from my old portfolio.",
            paragraphs: [
              "I grouped the strokes into vertical columns and varied their angles, spacing, and breaks. A fixed random seed kept the texture identical each time the page loaded at the same canvas size.",
              "As you scrolled into the reading area, the site reused the rendered texture, moving the columns in different directions and at different speeds. Once the motion stopped, the hatching stayed in place as the background.",
            ],
          },
          zh: {
            heading: "把手绘排线带进浏览器",
            description: "在这个网站较早的一个版本里，我用 Canvas 重现了旧作品集中的手绘排线。",
            paragraphs: [
              "我把笔画排成竖列，让每一笔的倾斜角度、间距和断开的位置略有不同。为了让同样大小的画布每次都能画出相同的纹理，我给随机数生成器设定了固定的种子。",
              "当页面滚动到正文时，网站直接复用已经画好的纹理，让各列线条以不同的速度朝不同方向移动。等动作停下来，排线就留在原处，成为正文的背景。",
            ],
          },
        },
      },
    ],
  },
];

export function getBlogCollections(language: BlogLanguage): BlogCollection[] {
  return collections.map(collection => ({
    slug: collection.slug,
    ...collection.copy[language],
    entries: collection.entries.map(entry => ({ slug: entry.slug, ...entry.copy[language] })),
  }));
}

export const blogCollections = getBlogCollections("en");

export function findBlogCollection(slug: string, language: BlogLanguage = "en") {
  return getBlogCollections(language).find(collection => collection.slug === slug);
}

export function collectionPath(collection: BlogCollection) {
  return `/${collection.slug}/`;
}

export function entryPath(collection: BlogCollection, entry: BlogEntry) {
  return `${collectionPath(collection)}${entry.slug}/`;
}
