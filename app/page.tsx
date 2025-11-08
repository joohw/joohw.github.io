// 首页组件
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-xl w-full space-y-16">
        <div className="space-y-3">
          <h1 className="text-5xl font-extralight tracking-tight">Joo Hwang</h1>
          <p className="text-muted-foreground text-base leading-relaxed font-light">
            极简 · 专注 · 记录
          </p>
        </div>
        <div className="space-y-6 pt-12 border-t border-border/50">
          <article className="space-y-3">
            <h2 className="text-xl font-light text-foreground/90">关于</h2>
            <p className="text-muted-foreground leading-relaxed text-sm font-light">
              这里是我的的个人博客，专注于分享想法。
            </p>
          </article>
          <article className="space-y-3">
            <h2 className="text-xl font-light text-foreground/90">项目</h2>
            <p className="text-muted-foreground leading-relaxed text-sm font-light">
              这里展示一些我参与或开发的项目。
            </p>
          </article>
          <article className="space-y-3">
            <h2 className="text-xl font-light text-foreground/90">文章</h2>
            <p className="text-muted-foreground leading-relaxed text-sm font-light">
              这里是我写的文章和笔记。
            </p>
          </article>
        </div>
      </div>
    </main>
  );
}
