// Product analytics for the app (PostHog). Testers stay anonymous: no wallet
// or vault address, no amounts, no autocapture of on-screen text, no session
// recording. Events say THAT something happened ("advance taken"), never
// who or how much. Does nothing until NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is set.

import posthog, { type CaptureResult } from "posthog-js";

// Set by the Vercel PostHog integration (Production and Preview).
const KEY = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

let started = false;

// Wallet and RPC errors embed addresses, calldata and signatures. Cut every
// long hex value down before anything leaves the phone.
const HEX = /0x[0-9a-fA-F]{8,}/g;
const scrub = (v: unknown): unknown =>
  typeof v === "string"
    ? v.replace(HEX, "0x…")
    : Array.isArray(v)
      ? v.map(scrub)
      : v && typeof v === "object"
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, scrub(x)]))
        : v;

function scrubEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  if (event.event === "$exception" || event.event === "tx_failed") {
    event.properties = scrub(event.properties) as CaptureResult["properties"];
  }
  return event;
}

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
    capture_exceptions: true, // crashes and unhandled promise errors, with stack traces
    before_send: scrubEvent,
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

/** A caught error (a failed transaction, say) as a PostHog issue with its stack trace. */
export function reportError(error: unknown, action: string) {
  if (!started) return;
  posthog.captureException(error, { action });
}

/** Only short labels go in props (e.g. { action: "advance" }), never addresses or amounts. */
export function track(event: AppEvent, props?: Record<string, string | boolean>) {
  if (!started) return;
  posthog.capture(event, props);
}
