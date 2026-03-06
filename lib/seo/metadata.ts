import type { Metadata } from "next";

const FALLBACK_SITE_URL = "https://webiculum.com";
export const DEFAULT_OG_IMAGE_PATH = "/template-previews/sergio-top.png";
export const DEFAULT_OG_IMAGE_ALT =
  "Webiculum platform preview — AI-powered CV to website generator";

export const DEFAULT_SEO_KEYWORDS = [
  "ai resume builder",
  "cv to website",
  "resume website generator",
  "personal website builder",
  "professional portfolio website",
  "online resume",
  "resume to html",
  "career branding",
  "subdomain portfolio",
  "webiculum",
];

function normalizeSiteUrl(value?: string | null): string {
  const raw = value?.trim();
  if (!raw) return FALLBACK_SITE_URL;

  try {
    const parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export function getSiteUrl(): string {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL);
}

export function buildAbsoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, getSiteUrl()).toString();
}

type BuildPageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  imagePath?: string;
  imageAlt?: string;
  type?: "website" | "article" | "profile";
  noIndex?: boolean;
};

export function buildPageMetadata({
  title,
  description,
  path,
  keywords = [],
  imagePath = DEFAULT_OG_IMAGE_PATH,
  imageAlt = DEFAULT_OG_IMAGE_ALT,
  type = "website",
  noIndex = false,
}: BuildPageMetadataOptions): Metadata {
  const canonical = buildAbsoluteUrl(path);
  const image = buildAbsoluteUrl(imagePath);

  return {
    title,
    description,
    keywords: Array.from(new Set([...DEFAULT_SEO_KEYWORDS, ...keywords])),
    alternates: {
      canonical,
    },
    openGraph: {
      type,
      locale: "en_US",
      url: canonical,
      siteName: "Webiculum",
      title,
      description,
      images: [
        {
          url: image,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
          },
        },
  };
}
