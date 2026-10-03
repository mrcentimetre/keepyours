// Web push: lets the keeper reach the phone while the app is closed. The
// browser gives us a push subscription (an endpoint plus keys); we register it
// for the person's vault through /api/push, which hands it to the keeper.
// Only the vault address goes with it, and vault activity is public on-chain.

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PUSH_KEY = "ky_push_vault"; // the vault this phone is registered for

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(VAPID_PUBLIC_KEY) &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** True once this phone is registered for this vault: the app then leaves notifications to push. */
export function pushActiveFor(vault: string | null): boolean {
  if (!vault) return false;
  try {
    return localStorage.getItem(PUSH_KEY)?.toLowerCase() === vault.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Subscribe (or refresh the subscription) and register it for `vault`.
 * Safe to call on every app open: the keeper de-duplicates by endpoint.
 * Only runs when notifications are already allowed; never prompts.
 */
export async function registerPush(vault: string): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      }));
    const res = await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vault, subscription: sub.toJSON() }),
    });
    if (!res.ok) return false;
    localStorage.setItem(PUSH_KEY, vault);
    return true;
  } catch {
    return false;
  }
}

/** Sign out: stop pushes to this phone for the old vault. */
export async function unregisterPush(): Promise<void> {
  try {
    localStorage.removeItem(PUSH_KEY);
    const reg = await navigator.serviceWorker?.getRegistration();
    await (await reg?.pushManager.getSubscription())?.unsubscribe();
  } catch {}
}
