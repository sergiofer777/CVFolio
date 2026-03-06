import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import SignupPageClient from "./signup-page-client";

export const metadata: Metadata = buildPageMetadata({
  title: "Create Account",
  description:
    "Create your Webiculum account and start turning your CV into a professional website with AI in under a minute.",
  path: "/signup",
  keywords: [
    "webiculum signup",
    "create resume website account",
    "ai cv website registration",
  ],
  imagePath: "/template-previews/sergio-top.png",
  imageAlt: "Webiculum signup page preview",
  noIndex: true,
});

export default function SignupPage() {
  return <SignupPageClient />;
}
