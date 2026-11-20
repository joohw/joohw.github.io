import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const portfolioSerif = localFont({
  src: "../.font-build/portfolio.woff2",
  weight: "250 900",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Georgia", "serif"],
});

export const metadata: Metadata = {
  title: "个人博客",
  description: "极简风格的个人博客",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={portfolioSerif.className}>{children}</body>
    </html>
  );
}

