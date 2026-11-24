import type { BlogCopy, BlogLanguage } from "./blog-content";

export const lamportInterview = "https://youtu.be/U719vQz-WFs?t=3598";

export const blogHomeCopy = {
  en: {
    about: {
      heading: "About me",
      paragraphs: [
        "I'm Joo Hwang, an independent designer and full-stack engineer.",
        "I studied architecture and worked as an architectural designer. I also taught myself to code and build products. The first product I made was Noolingo. It uses spaced repetition to help learners remember what they study.",
        "AI has sped up both design and development for me. I can take an idea that's still taking shape, sketch it, and build something people can try. Putting it out into the world helps me find out sooner which ideas are worth pursuing.",
      ],
    },
    writing: {
      heading: "Why I write",
      intro: "Writing is one of the best ways I know to teach myself something. An idea can feel clear in my head until I try to put it into words. Working through those sentences helps me see what I actually understand.",
      quote: "If you think you know something but don’t write it down, you only think you know it.",
      credit: "Leslie Lamport, creator of LaTeX",
      plans: "I'll share early prototypes here, along with what I was thinking when I made them and why I made certain decisions. I also want to revisit those decisions from time to time and write down the details. I'm aiming to post once a week.",
    },
    articleList: "Articles",
    contact: "Contact me",
    rednote: "Xiaohongshu",
  },
  zh: {
    about: {
      heading: "关于我",
      paragraphs: [
        "我是 JooHwang，一名独立设计师，也是一名全栈工程师。",
        "我学的是建筑设计，曾经是一名建筑设计师，也自学了写代码和做产品。我的第一款产品是 Noolingo，它用间隔重复的方法帮助学习者更牢地记住所学的知识。",
        "AI 让我的设计和开发速度都快了许多。现在，我可以把还在酝酿的想法画成草图，做成能上手体验的产品，再发布给更多人试用，更快地验证这些想法。",
      ],
    },
    writing: {
      heading: "为什么要写博客",
      intro: "我始终觉得，写作是一种很好的自学方式。有些概念在脑子里似乎已经想明白了，真正动笔时才发现还有模棱两可的地方。一句句写下去，想法也就慢慢清楚了。",
      quote: "如果你觉得自己懂了，却没把它写下来，那你只是以为自己懂了。",
      credit: "LaTeX 创作者 Leslie Lamport",
      plans: "我会在这里分享一些早期的产品原型，写下当时的想法，聊聊为什么做那些决定。我也想定期回头看看，把容易忘记的细节记下来，尽量每周更新一次。",
    },
    articleList: "文章列表",
    contact: "联系我",
    rednote: "小红书",
  },
} satisfies Record<BlogLanguage, {
  about: BlogCopy;
  writing: { heading: string; intro: string; quote: string; credit: string; plans: string };
  articleList: string;
  contact: string;
  rednote: string;
}>;
