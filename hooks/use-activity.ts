"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { notificationText, readActivity, type ActivityItem } from "@/lib/activity";
import { readCache, writeCache } from "@/lib/cache";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

const POLL_MS = 20_000;
const SEEN_KEY = "ky_activity_seen_at"; // newest item the person has looked at
const NOTIFIED_KEY = "ky_activity_notified_at"; // newest item a phone notification went out for

// Things that happen TO you rather than BY you in this app: these also get a
// toast while the app is open. Everything gets a phone notification.
const FROM_OUTSIDE = new Set(["payment", "received", "settled"]);

function readNum(key: string): number {
  try {
    return Number(localStorage.getItem(key) ?? 0);
  } catch {
    return 0;
  }
}

function writeNum(key: string, n: number) {
  try {
    localStorage.setItem(key, String(n));
  } catch {}
}

/** A phone notification for any on-chain event on this vault, if the person allowed them. */
async function notify(item: ActivityItem) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const { title, body } = notificationText(item);
    await reg?.showNotification(title, {
      body,
      icon: "/icon-192.png",
      tag: item.id,
    });
  } catch {
    // The in-app list still shows it.
  }
}

/** On-chain activity, newest first, plus how many items are unread. */
export function useActivity(owner: string | null, vault: Address | null) {
  const key = `activity:${vault}`;
  const [items, setItems] = useState<ActivityItem[] | null>(() => (vault ? readCache<ActivityItem[]>(key) : null));

  useEffect(() => {
    if (vault) setItems((v) => v ?? readCache<ActivityItem[]>(key));
  }, [vault, key]);
  const [seenAt, setSeenAt] = useState(0);
  const first = useRef(true);

  useEffect(() => setSeenAt(readNum(SEEN_KEY)), []);

  const refresh = useCallback(async () => {
    if (!owner || !vault) return;
    try {
      const next = await readActivity(owner as Address, vault);
      setItems(next);
      writeCache(key, next);
      const notifiedAt = readNum(NOTIFIED_KEY);
      // Never notify for history on the first load after install.
      if (first.current && notifiedAt === 0) {
        writeNum(NOTIFIED_KEY, next[0]?.at ?? Date.now());
      } else {
        // Oldest first, so notifications stack in the order things happened.
        const fresh = next.filter((i) => i.at > notifiedAt).reverse();
        for (const i of fresh) {
          // In the app: a toast, plus a haptic where the phone allows one
          // without a tap (Android always; iPhone usually not). Outside the
          // app, the phone notification is what buzzes.
          if (document.visibilityState === "visible" && FROM_OUTSIDE.has(i.kind)) {
            haptic();
            toast.success(`+$${i.amount.toFixed(2)} received`, { description: i.detail });
          }
          await notify(i);
        }
        if (next[0]) writeNum(NOTIFIED_KEY, Math.max(notifiedAt, next[0].at));
      }
      first.current = false;
    } catch {
      // Keep the last list; the next poll tries again.
    }
  }, [owner, vault, key]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const markSeen = useCallback(() => {
    const newest = items?.[0]?.at ?? Date.now();
    writeNum(SEEN_KEY, newest);
    setSeenAt(newest);
  }, [items]);

  const unread = items ? items.filter((i) => i.at > seenAt).length : 0;
  return { items, unread, seenAt, markSeen, refresh };
}
