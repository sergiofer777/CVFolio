import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import { getServerLocale } from "@/lib/locale-server";
import {
  buildAbsoluteUrl,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_SEO_KEYWORDS,
  getSiteUrl,
} from "@/lib/seo/metadata";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Webiculum | Turn Your CV into a Professional Website with AI",
    template: "%s | Webiculum",
  },
  description:
    "Transform your CV into a professional website with AI in seconds. Publish on your own subdomain, share instantly, and download in HTML.",
  keywords: DEFAULT_SEO_KEYWORDS,
  authors: [{ name: "Webiculum" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: getSiteUrl(),
    siteName: "Webiculum",
    title: "Webiculum | AI CV to Website Builder",
    description:
      "Create your professional website from a CV in seconds with AI. Publish, share, and manage it from one dashboard.",
    images: [
      {
        url: buildAbsoluteUrl(DEFAULT_OG_IMAGE_PATH),
        alt: DEFAULT_OG_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Webiculum | AI CV to Website Builder",
    description:
      "Create your professional website from a CV in seconds with AI. Publish, share, and manage it from one dashboard.",
    images: [buildAbsoluteUrl(DEFAULT_OG_IMAGE_PATH)],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getServerLocale();

  return (
    <html lang={locale} className={dmSans.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,300;1,9..144,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${dmSans.className} grain`}>{children}</body>
    </html>
  );
}
