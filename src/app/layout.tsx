import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VibeCheck - Tinder for Music",
  description: "Find out how well you know your friend's music taste. A fun party game powered by Spotify.",
  keywords: ["music", "game", "spotify", "party", "friends", "vibecheck"],
  openGraph: {
    title: "VibeCheck - Tinder for Music",
    description: "Find out how well you know your friend's music taste",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
