import type { Metadata } from "next";
import { Fraunces, Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { brand } from "@/config/brand";
import { rootRobotsMetadata } from "@/lib/seo";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const chat = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-chat",
  display: "swap",
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(brand.canonicalUrl),
  applicationName: brand.name,
  title: {
    default: brand.seoTitle,
    template: `%s · ${brand.name}`,
  },
  description: brand.seoDescription,
  category: "religion",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: brand.name,
    title: brand.seoTitle,
    description: brand.seoDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: brand.seoTitle,
    description: brand.seoDescription,
  },
  robots: rootRobotsMetadata(),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${display.variable} ${sans.variable} ${chat.variable} font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
