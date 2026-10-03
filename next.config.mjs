import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import withPWAInit from "@ducanh2912/next-pwa";
import { appVersion } from "./scripts/version.mjs";

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

// Version from the commit history (scripts/version.mjs), plus the commit it
// was built from. Vercel needs VERCEL_DEEP_CLONE=true for the full history;
// without it the version is left blank rather than guessed.
function commitSha() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion() ?? "",
    NEXT_PUBLIC_APP_COMMIT: commitSha(),
  },
  reactStrictMode: true,
  // There is a stray package-lock.json in the home directory; without this,
  // the bundler walks up past the repo looking for the workspace root.
  outputFileTracingRoot: here,
  turbopack: { root: here },
};

export default withPWA(nextConfig);
