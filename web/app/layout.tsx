import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "./components/Header";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BananaWatch Dashboard",
  description: "Wound healing simulation MVP — 28 patients",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "50x50", type: "image/png" },
      { url: "/apple-icon.png", sizes: "100x100", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontSans.variable}>
      <body className="min-h-screen bg-surface-muted font-sans antialiased">
        <Header />
        <main className="min-h-[calc(100vh-3.5rem)] px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
