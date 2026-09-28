import type { MetadataRoute } from "next";

// Next.js's built-in manifest convention: serves this at /manifest.webmanifest.
// Scoped to /app so the waitlist at / is never treated as part of the
// installable app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Keep Yours",
    short_name: "Keep Yours",
    description: "Savings for people paid in crypto.",
    id: "/app",
    start_url: "/app",
    scope: "/app",
    display: "standalone",
    background_color: "#060E0A",
    theme_color: "#060E0A",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      // Chrome's installability check wants a plain (purpose: "any") icon at
      // 512px, not just a maskable one — without it, beforeinstallprompt can
      // silently never fire even though everything else is valid.
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
