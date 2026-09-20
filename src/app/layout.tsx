import type { Metadata, Viewport } from "next";
import "./globals.css";
import { societyConfig } from "@/config/society";

export const metadata: Metadata = {
  title: `${societyConfig.name} - ${societyConfig.tagline}`,
  description: societyConfig.description,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: societyConfig.shortName,
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: societyConfig.theme.themeColor,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeColor = societyConfig.theme.themeColor;

  return (
    <html
      lang="en"
      style={
        {
          "--theme-primary": themeColor,
        } as React.CSSProperties
      }
    >
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-theme-light">
        <div className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto px-4 py-3 sm:py-6">
          {children}
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration skipped or error:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
