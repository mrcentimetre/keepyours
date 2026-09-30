"use client";

import { useCallback, useEffect, useState } from "react";

export type NotifyPermission = "default" | "granted" | "denied" | "unsupported";

/**
 * The phone's notification permission, kept in sync when the person comes
 * back from Settings. `ask()` shows the native prompt; it must run inside a
 * tap, and after "denied" the browser never shows it again (only Settings
 * can undo that). Pattern from chess-academy-dashboard's notifications.
 */
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotifyPermission>("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    const sync = () => setPermission(Notification.permission as NotifyPermission);
    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const ask = useCallback(async (): Promise<NotifyPermission> => {
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission !== "default") return Notification.permission as NotifyPermission;
    const result = (await Notification.requestPermission()) as NotifyPermission;
    setPermission(result);
    if (result === "granted") {
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        await reg?.showNotification("Notifications are on", {
          body: "We'll tell you when money arrives.",
          icon: "/icon-192.png",
          tag: "keep-yours-welcome",
        });
      } catch {
        // The permission is what matters.
      }
    }
    return result;
  }, []);

  return { permission, ask };
}
