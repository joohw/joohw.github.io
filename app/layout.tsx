import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}

