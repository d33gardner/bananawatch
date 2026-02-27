import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BananaWatch Dashboard",
  description: "Wound healing simulation MVP — 28 patients",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white">
          <nav className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
            <span className="text-lg font-semibold text-gray-900">
              BananaWatch
            </span>
            <span className="ml-4 text-sm text-gray-500">Dashboard</span>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
