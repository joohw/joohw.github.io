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
  title: "Joo Hwang's Blog",
  description: "A minimalist personal blog by Joo Hwang.",
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

