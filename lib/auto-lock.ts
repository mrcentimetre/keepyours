// Auto-lock: after the person has been away from the app for their chosen
// time, the screens are covered (balances included) until Face ID again.
// It only guards the screen. Moving money already needs Face ID every time.

export type AutoLock = 0 | 60 | 300 | 900 | -1; // seconds away; 0 = immediately, -1 = never

export const AUTO_LOCK_OPTIONS: { value: AutoLock; label: string }[] = [
  { value: 0, label: "Immediately" },
  { value: 60, label: "After 1 minute" },
  { value: 300, label: "After 5 minutes" },
  { value: 900, label: "After 15 minutes" },
  { value: -1, label: "Never" },
];

const SETTING_KEY = "ky_auto_lock";
// When the app was last put away. In localStorage, not memory, so a cold
// launch (e.g. from a notification straight into Home) is covered too.
const AWAY_KEY = "ky_away_at";
const DEFAULT: AutoLock = 60;

export function getAutoLock(): AutoLock {
  try {
    const raw = localStorage.getItem(SETTING_KEY);
    const n = raw === null ? DEFAULT : Number(raw);
    return AUTO_LOCK_OPTIONS.some((o) => o.value === n) ? (n as AutoLock) : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function setAutoLock(value: AutoLock) {
  try {
    localStorage.setItem(SETTING_KEY, String(value));
  } catch {}
}

export function autoLockLabel(value: AutoLock): string {
  return AUTO_LOCK_OPTIONS.find((o) => o.value === value)?.label ?? "";
}

// Open Face ID / passkey prompts. On Android the passkey sheet can hide the
// page for a moment; that's the person approving, not leaving the app.
let held = 0;

export async function withAutoLockHeld<T>(fn: () => Promise<T>): Promise<T> {
  held++;
  try {
    return await fn();
  } finally {
    held--;
    clearAway();
  }
}

export function isAutoLockHeld(): boolean {
  return held > 0;
}

export function markAway() {
  if (held > 0) return;
  try {
    localStorage.setItem(AWAY_KEY, String(Date.now()));
  } catch {}
}

/** Back in the app, or just unlocked: the away clock starts over. */
export function clearAway() {
  try {
    localStorage.removeItem(AWAY_KEY);
  } catch {}
}

/** Has the person been away long enough that the app should be locked? */
export function shouldLock(): boolean {
  const setting = getAutoLock();
  if (setting < 0) return false;
  try {
    const away = Number(localStorage.getItem(AWAY_KEY));
    return away > 0 && Date.now() - away >= setting * 1000;
  } catch {
    return false;
  }
}
