"use client";

import { useEffect } from "react";

/**
 * @ducanh2912/next-pwa's own auto-registration hooks into the Pages
 * Router's _document.js, which doesn't exist under the App Router — so it
 * silently never runs here. This is what actually registers /sw.js.
 * (Same gap, same fix, as an earlier PWA build — see chess-academy-dashboard's
 * components/register-sw.tsx.)
 */
export default function RegisterSW() {
  useEffect(() => {
    // next.config.mjs disables the plugin in development (no real sw.js is
    // built there), so registering would either 404 or pick up a stale file
    // from a previous production build sitting in /public.
    if (process.env.NODE_ENV === "development") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not fatal: the app still works, it just won't be installable until
      // this succeeds (e.g. blocked in a private window).
    });
  }, []);

  return null;
}
