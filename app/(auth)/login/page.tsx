import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";
import LoginPageClient from "./login-page-client";

export const metadata: Metadata = buildPageMetadata({
  title: "Log In",
  description:
    "Sign in to Webiculum and manage your AI-generated professional websites, publishing settings, and subscription plan.",
  path: "/login",
  keywords: [
    "webiculum login",
    "resume website account",
    "portfolio dashboard login",
  ],
  imagePath: "/brand/webiculum-og-logo.jpg",
  imageAlt: "Webiculum login page preview",
  noIndex: true,
});

export default function LoginPage() {
  return <LoginPageClient />;
}
