import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Playlog — Track. Rate. Remember.",
    template: "%s · Playlog",
  },
  description:
    "Playlog is a personal game journal. Track the games you play, rate them, and remember every experience.",
};

export const viewport: Viewport = {
  themeColor: "#0f1115",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sora.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
