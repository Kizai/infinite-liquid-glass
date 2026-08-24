import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Infinite Liquid Glass",
  description:
    "An interactive liquid-glass infinite gallery experiment with real-time refraction and chromatic dispersion.",
  openGraph: {
    title: "Infinite Liquid Glass",
    description:
      "An interactive liquid-glass infinite gallery experiment with real-time refraction and chromatic dispersion.",
    type: "website",
    images: [{ url: "/og.webp", width: 1536, height: 1024 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Infinite Liquid Glass",
    description: "Interactive liquid-glass gallery experiment.",
    images: ["/og.webp"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
