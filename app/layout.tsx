import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { getServerLocale } from "@/lib/locale-server";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "webiculum — Tu CV, convertido en portafolio",
    template: "%s | webiculum",
  },
  description:
    "Arrastra tu PDF. La IA extrae, estructura y diseña tu página personal profesional — lista para compartir en segundos.",
  keywords: ["curriculum", "portafolio", "CV", "portfolio", "profesional", "IA"],
  authors: [{ name: "webiculum" }],
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "webiculum",
    title: "webiculum — Tu CV, convertido en portafolio",
    description:
      "Arrastra tu PDF. La IA extrae, estructura y diseña tu página personal profesional — lista para compartir en segundos.",
  },
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
