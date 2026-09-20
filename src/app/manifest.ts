import type { MetadataRoute } from "next";
import { societyConfig } from "@/config/society";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${societyConfig.name} Resident Directory`,
    short_name: societyConfig.shortName,
    description: societyConfig.description,
    start_url: "/",
    id: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f8fafc",
    theme_color: societyConfig.theme.themeColor,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/desktop.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: `${societyConfig.name} Resident Directory Desktop View`,
      },
      {
        src: "/screenshots/mobile.png",
        sizes: "540x960",
        type: "image/png",
        form_factor: "narrow",
        label: `${societyConfig.name} Resident Directory Mobile View`,
      },
    ],
  };
}
