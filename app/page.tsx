import { BlogScroll } from "./blog-scroll";

const email = (
  <a
    className="underline underline-offset-4 hover:text-foreground"
    href="mailto:sungizhow@gmail.com"
  >
    sungizhow@gmail.com
  </a>
);

const overview = {
  heading: "从草图到可以亲手试的东西",
  description: "我做设计，也写代码。很多界面上的问题，只有做出来、用过一遍，才知道该怎么改。这个站点用来放这些实验和笔记。",
};

const sections = [
  {
    id: "projects",
    title: "项目",
    heading: "用滚动组织一座个人站",
    description: "同一个深蓝植物场景把自我介绍和正文连在一起。向下滚动时，右上角出现导航标签。",
    featured: true,
    content: (
      <>
        <p>
          首屏只显示姓名和简介。往下滚时，它们移到左上角，右上角的标签可以切换栏目。
        </p>
        <p>
          再往下，正文从下方滚进视野。插画里的枝条停在原处，叶尖随着微风轻轻偏转。
        </p>
      </>
    ),
  },
  {
    id: "writing",
    title: "文章",
    heading: "手绘排线怎样进了浏览器",
    description: "在本站的早期版本里，我用 Canvas 重画了旧作品集里的手绘排线。",
    featured: true,
    content: (
      <>
        <p>
          先把排线分成竖列，再给每一列里的线条安排不同的斜率、间距和断点。生成过程使用固定种子，同样的画布尺寸每次打开都会画出同一张纹理。
        </p>
        <p>
          当时滚进阅读区时，程序会复用画好的纹理，让各列沿不同方向、以不同速度移动。流动结束后，排线留作阅读区的背景。
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "联系",
    heading: "给我写封邮件",
    description: "如果你对这里的项目或文章有想法，欢迎写信交流。",
    content: email,
  },
];

export default function Home() {
  return <BlogScroll overview={overview} sections={sections} />;
}
