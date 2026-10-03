// Last-known values for on-chain reads, so switching tabs or opening the app
// on a slow connection shows numbers straight away and refreshes quietly.
// Kept in memory for this session and on the phone for the next launch.
// Only public data goes here: balances, vault state, activity.

const PREFIX = "ky_cache:";
const memory = new Map<string, unknown>();

export function readCache<T>(key: string): T | null {
  if (memory.has(key)) return memory.get(key) as T;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const value = JSON.parse(raw) as T;
    memory.set(key, value);
    return value;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, value: T) {
  memory.set(key, value);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Memory still has it for this session.
  }
}

/** Sign out: nothing from this wallet stays on the phone. */
export function clearCache() {
  memory.clear();
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) localStorage.removeItem(k);
    }
  } catch {}
}
