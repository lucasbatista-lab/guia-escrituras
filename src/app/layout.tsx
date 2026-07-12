import type { Metadata } from "next";
import { Fraunces, Source_Sans_3, Source_Serif_4 } from "next/font/google";
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

const appUrl = process.env.APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Guia Escrituras",
    template: "%s · Guia Escrituras",
  },
  description:
    "Reflexões e orientações baseadas nas Escrituras — uma experiência de inteligência artificial. Como Jesus responderia à sua situação?",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${display.variable} ${sans.variable} ${chat.variable} font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
