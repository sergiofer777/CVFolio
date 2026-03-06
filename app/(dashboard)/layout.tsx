import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Dashboard",
  description:
    "Manage your generated websites, billing, publishing settings, and AI iterations from your Webiculum dashboard.",
  path: "/dashboard",
  keywords: [
    "webiculum dashboard",
    "manage portfolio website",
    "website publishing dashboard",
  ],
  imagePath: "/template-previews/ivan-top.png",
  imageAlt: "Webiculum dashboard preview",
  noIndex: true,
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
