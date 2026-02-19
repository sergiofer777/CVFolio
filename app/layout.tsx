import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "CVfolio — Tu CV, convertido en portafolio",
    template: "%s | CVfolio",
  },
  description:
    "Arrastra tu PDF. La IA extrae, estructura y diseña tu página personal profesional — lista para compartir en segundos.",
  keywords: ["curriculum", "portafolio", "CV", "portfolio", "profesional", "IA"],
  authors: [{ name: "CVfolio" }],
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "CVfolio",
    title: "CVfolio — Tu CV, convertido en portafolio",
    description:
      "Arrastra tu PDF. La IA extrae, estructura y diseña tu página personal profesional — lista para compartir en segundos.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={dmSans.variable}>
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
