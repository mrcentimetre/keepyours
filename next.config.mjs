import path from "node:path";
import { fileURLToPath } from "node:url";
import withPWAInit from "@ducanh2912/next-pwa";

const here = path.dirname(fileURLToPath(import.meta.url));

// @ducanh2912/next-pwa is a webpack plugin (Workbox-based) — there is no
// Turbopack build support, hence `next build --webpack` in package.json.
// Dev still uses Turbopack via `next dev`; the plugin disables itself in
// development anyway (see `disable` below), so the two never actually
// conflict.
const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  // false leaves a new service worker waiting until every open instance of
  // the installed app is fully closed, not just backgrounded — indefinite on
  // a phone. true activates the new version on next launch instead.
  skipWaiting: true,
  clientsClaim: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: "StaleWhileRevalidate",
        options: { cacheName: "images" },
      },
      {
        urlPattern: /\/_next\/static\/.+\.js$/i,
        handler: "CacheFirst",
        options: { cacheName: "next-static-js" },
      },
      {
        urlPattern: /\/_next\/image\?url=.+/i,
        handler: "StaleWhileRevalidate",
        options: { cacheName: "next-image" },
      },
      {
        urlPattern: /\/api\/.*/i,
        handler: "NetworkOnly",
      },
      {
        urlPattern: /.*/i,
        handler: "NetworkFirst",
        options: { cacheName: "others", networkTimeoutSeconds: 10 },
      },
    ],
  },
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        { key: "Content-Type", value: "application/javascript" },
        { key: "Cache-Control", value: "no-cache" },
        { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
      ],
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // There is a stray package-lock.json in the home directory; without this,
  // the bundler walks up past the repo looking for the workspace root.
  outputFileTracingRoot: here,
  turbopack: { root: here },
};

export default withPWA(nextConfig);
