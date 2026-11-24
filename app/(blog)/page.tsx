import type { Metadata } from "next";
import { BlogScroll } from "../blog-scroll";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return <BlogScroll />;
}
