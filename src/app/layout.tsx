import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { HydrationSuppressor } from "@/components/HydrationSuppressor";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SocialRing - Social Media Management Platform",
  description: "Manage all your social media accounts in one place. Post to Twitter, Facebook, Instagram, LinkedIn, TikTok, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-gray-950 antialiased`}
      >
        <HydrationSuppressor />
        {children}
        <Toaster position="top-right" richColors duration={5000} />
      </body>
    </html>
  );
}
