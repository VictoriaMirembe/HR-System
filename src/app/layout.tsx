import type { Metadata } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";

// Matches the typeface used on mciug.org, for visual consistency with the
// organization's brand.
const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MCI HR System",
  description: "Media Challenge Initiative — HR management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${urbanist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
