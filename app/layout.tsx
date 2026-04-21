import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Serif, Outfit } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  variable: "--font-editorial",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dormify AI",
  description: "your room, but actually cute. ai powered redesign for renters and students.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0907",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${bricolage.variable} ${instrument.variable} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
