import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/settings";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings(["site.title", "site.description", "site.favicon"]);
  const title = s["site.title"] || "Hammer Admin";
  const description = s["site.description"] || "Hammer services marketplace — operations dashboard";
  const faviconPath = s["site.favicon"];
  const faviconUrl = faviconPath
    ? `/uploads/${faviconPath.replace(/^\/+/, "")}`
    : "/favicon.ico";

  return {
    title,
    description,
    icons: { icon: faviconUrl, shortcut: faviconUrl },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
