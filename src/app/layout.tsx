import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ganesh Heritage - Member Directory",
  description: "Searchable resident directory for Ganesh Heritage Co-operative Housing Society",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-teal-100">
        <div className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto px-4 py-3 sm:py-6">
          {children}
        </div>
      </body>
    </html>
  );
}
