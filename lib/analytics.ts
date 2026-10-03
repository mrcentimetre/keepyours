// Product analytics for the app (PostHog). Testers stay anonymous: no wallet
// or vault address, no amounts, no autocapture of on-screen text, no session
// recording. Events say THAT something happened ("advance taken"), never
// who or how much. Does nothing until NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is set.

import posthog from "posthog-js";

// Set by the Vercel PostHog integration (Production and Preview).
const KEY = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let started = false;

export function startAnalytics() {
  if (started || !KEY || typeof window === "undefined") return;
  started = true;
  posthog.init(KEY, {
    api_host: HOST,
    person_profiles: "identified_only", // we never identify, so everyone stays anonymous
    capture_pageview: false, // sent by hand on each App Router navigation, without query strings
    capture_pageleave: true,
    autocapture: false, // clicks would carry button text, which can include balances
    disable_session_recording: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    persistence: "localStorage",
  });
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  posthog.register({ installed: standalone, app: "keep-yours" });
}

export function trackPage(pathname: string) {
  if (!started) return;
  posthog.capture("$pageview", { $current_url: window.location.origin + pathname });
}

export type AppEvent =
  | "vault_created"
  | "payment_split"
  | "advance_taken"
  | "advance_repaid"
  | "withdraw_requested"
  | "withdraw_cancelled"
  | "withdraw_completed"
  | "send_completed"
  | "notifications_answered"
  | "tx_failed";

/** Only short labels go in props (e.g. { action: "advance" }), never addresses or amounts. */
export function track(event: AppEvent, props?: Record<string, string | boolean>) {
  if (!started) return;
  posthog.capture(event, props);
}
