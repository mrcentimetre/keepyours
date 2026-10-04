"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Telegram alerts for the vault: whether they're connected, and connect().
 * Re-checks when the person comes back from Telegram.
 */
export function useTelegram(vault: string | null) {
  const [enabled, setEnabled] = useState(false);
  const [linked, setLinked] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const refresh = useCallback(async () => {
    if (!vault) return;
    try {
      const res = await fetch(`/api/telegram?vault=${vault}`, { cache: "no-store" });
      const j = (await res.json()) as { enabled?: boolean; linked?: boolean };
      setEnabled(Boolean(j.enabled));
      setLinked(Boolean(j.linked));
    } catch {
      // keep what we had
    }
  }, [vault]);

  useEffect(() => {
    refresh();
    const onBack = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onBack);
    return () => document.removeEventListener("visibilitychange", onBack);
  }, [refresh]);

  /** Opens Telegram on the bot with a one-time code. Returns false if that failed. */
  const connect = useCallback(async (): Promise<boolean> => {
    if (!vault) return false;
    setConnecting(true);
    try {
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vault }),
      });
      const j = (await res.json()) as { url?: string };
      if (!res.ok || !j.url) return false;
      window.location.href = j.url; // hands off to the Telegram app
      return true;
    } catch {
      return false;
    } finally {
      setConnecting(false);
    }
  }, [vault]);

  return { enabled, linked, connecting, connect, refresh };
}
