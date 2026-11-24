import type { Metadata } from "next";
import localFont from "next/font/local";
import { blogSiteMetadata } from "@/lib/blog-content";
import "./globals.css";

const portfolioSerif = localFont({
  src: "../.font-build/portfolio.woff2",
  weight: "250 900",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Georgia", "serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://joohw.github.io"),
  ...blogSiteMetadata.en,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={portfolioSerif.className}>{children}</body>
    </html>
  );
}

