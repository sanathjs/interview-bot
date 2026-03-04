import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Interview Bot · Sanath Kumar J S",
  description: "AI-powered interview assistant with RAG knowledge base",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${dmSans.variable} antialiased`}
        style={{ background: "#0d0d0f", color: "#e8e8ef", fontFamily: "var(--font-dm-sans), DM Sans, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}