import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import LandingPageClient from "@/components/landing/landing-page-client";

export const metadata: Metadata = buildPageMetadata({
  title: "Webiculum | Your Story Deserves Something Better Than a PDF",
  description:
    "Turn your CV into a professional website in seconds with AI. Choose a template, publish with your own subdomain, and share a stronger personal brand.",
  path: "/",
  keywords: [
    "ai resume website",
    "cv to portfolio",
    "professional personal website",
    "resume landing page",
    "job search personal branding",
  ],
  imagePath: "/brand/webiculum-og-logo.jpg",
  imageAlt: "Webiculum landing page preview",
});

export default function HomePage() {
  return <LandingPageClient />;
}
