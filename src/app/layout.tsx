import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { SkipToContent } from "@/components/a11y/skip-to-content";
import { ConsentRoot } from "@/components/consent/consent-root";
import { brand } from "@/config/brand";
import {
  rootRobotsMetadata,
  socialOpenGraphImages,
  socialTwitterImages,
} from "@/lib/seo";
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
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/pwa-icon?size=192", sizes: "192x192", type: "image/png" },
      { url: "/pwa-icon?size=512", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/pwa-icon?size=180", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: brand.name,
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: brand.name,
    title: brand.seoTitle,
    description: brand.seoDescription,
    images: socialOpenGraphImages(),
  },
  twitter: {
    card: "summary_large_image",
    title: brand.seoTitle,
    description: brand.seoDescription,
    images: socialTwitterImages(),
  },
  robots: rootRobotsMetadata(),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#6b2e3a",
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
        <SkipToContent />
        <ConsentRoot>{children}</ConsentRoot>
      </body>
    </html>
  );
}
