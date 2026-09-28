// Display formatting shared by every screen (was copy-pasted per file).

export function formatUsdc(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "$1,234.56" split for display, so the cents can be set smaller/dimmer. */
export function splitUsdc(n: number): { whole: string; cents: string } {
  const [whole, cents] = formatUsdc(n).split(".");
  return { whole, cents };
}

export function shorten(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function timeAgo(at: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - at) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  // Past a day, "2d 04:10:05" reads better than "52:10:05".
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatCooldown(seconds: number): string {
  const hours = Math.round(seconds / 3600);
  if (hours < 24) return `${hours} hours`;
  if (hours % 24 !== 0) return `${hours} hours`;
  const days = hours / 24;
  return days === 1 ? "1 day" : `${days} days`;
}

/** Adjective form, for "a 3-day waiting period" rather than "a 3 days …". */
export function formatCooldownAdj(seconds: number): string {
  const hours = Math.round(seconds / 3600);
  return hours % 24 === 0 ? `${hours / 24}-day` : `${hours}-hour`;
}

export function formatDateTime(at: number): string {
  return new Date(at).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}
