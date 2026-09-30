"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { readActivity, type ActivityItem } from "@/lib/activity";

const POLL_MS = 20_000;
const SEEN_KEY = "ky_activity_seen_at"; // newest item the person has looked at
const NOTIFIED_KEY = "ky_activity_notified_at"; // newest item a phone notification went out for

const INCOMING = new Set(["payment", "received"]);

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

/** A phone notification for money that just arrived, if the person allowed them. */
async function notifyIncoming(item: ActivityItem) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.showNotification(`$${item.amount.toFixed(2)} received`, {
      body: item.detail ?? "Tap to see it in Keep Yours.",
      icon: "/icon-192.png",
      tag: item.id,
    });
  } catch {
    // The in-app list still shows it.
  }
}

/** On-chain activity, newest first, plus how many items are unread. */
export function useActivity(owner: string | null, vault: Address | null) {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [seenAt, setSeenAt] = useState(0);
  const first = useRef(true);

  useEffect(() => setSeenAt(readNum(SEEN_KEY)), []);

  const refresh = useCallback(async () => {
    if (!owner || !vault) return;
    try {
      const next = await readActivity(owner as Address, vault);
      setItems(next);
      const notifiedAt = readNum(NOTIFIED_KEY);
      // Never notify for history on the first load after install.
      if (first.current && notifiedAt === 0) {
        writeNum(NOTIFIED_KEY, next[0]?.at ?? Date.now());
      } else {
        const fresh = next.filter((i) => i.at > notifiedAt && INCOMING.has(i.kind));
        for (const i of fresh) await notifyIncoming(i);
        if (next[0]) writeNum(NOTIFIED_KEY, Math.max(notifiedAt, next[0].at));
      }
      first.current = false;
    } catch {
      // Keep the last list; the next poll tries again.
    }
  }, [owner, vault]);

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
