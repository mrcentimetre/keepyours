// Mock advance state for E3 (docs/BUILD-PLAN.md's fake data layer). Mirrors
// docs/SPEC.md §5: up to 50% of savings, one open advance at a time, fee
// tiers by days elapsed (free 0-30, 1.5% 31-60, 3% 61-90). The real advance
// is repaid automatically from the next deposit, before the split — this
// mock has no keeper/deposit pipeline, so repayment here is a manual
// "simulate" action instead, same idea as home-screen's simulated payment.

import { getKeptBalance } from "./mock-activity";

const ADVANCE_KEY = "ky_mock_advance";
const DAY_MS = 24 * 60 * 60 * 1000;

export type Advance = {
  amountUsdc: number;
  takenAt: number; // epoch ms
};

export const FEE_TIERS = [
  { label: "Free", rangeLabel: "Days 1–30", bps: 0 },
  { label: "1.5%", rangeLabel: "Days 31–60", bps: 150 },
  { label: "3%", rangeLabel: "Days 61–90", bps: 300 },
] as const;

export function getOpenAdvance(): Advance | null {
  try {
    const raw = localStorage.getItem(ADVANCE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.amountUsdc !== "number" || typeof parsed.takenAt !== "number") {
      return null;
    }
    return parsed as Advance;
  } catch {
    return null;
  }
}

export function getMaxAdvance(): number {
  return Math.floor(getKeptBalance() * 0.5 * 100) / 100;
}

/** Which fee tier an advance sits in right now, by days since it was taken.
 * Past day 90, SPEC says anyone can trigger settlement from savings — that's
 * a keeper-side behavior, out of scope for this owner-only mock, so it just
 * keeps showing the 3% tier as overdue. */
export function getFeeBps(takenAt: number, now = Date.now()): number {
  const daysElapsed = (now - takenAt) / DAY_MS;
  if (daysElapsed <= 30) return 0;
  if (daysElapsed <= 60) return 150;
  return 300;
}

export function isOverdue(takenAt: number, now = Date.now()): boolean {
  return (now - takenAt) / DAY_MS > 90;
}

export function getFeeOwed(advance: Advance, now = Date.now()): number {
  const bps = getFeeBps(advance.takenAt, now);
  return Math.round(advance.amountUsdc * (bps / 10000) * 100) / 100;
}

/** Returns null (instead of throwing) on an invalid request — the screen
 * checks the same conditions before enabling its confirm button, this is
 * just the source of truth both read. */
export function requestAdvance(amountUsdc: number): Advance | null {
  if (getOpenAdvance()) return null; // one open advance at a time (SPEC.md §5)
  const max = getMaxAdvance();
  if (!Number.isFinite(amountUsdc) || amountUsdc <= 0 || amountUsdc > max) return null;
  const advance: Advance = { amountUsdc, takenAt: Date.now() };
  try {
    localStorage.setItem(ADVANCE_KEY, JSON.stringify(advance));
  } catch {
    // fine without persistence; the advance just won't stick on reload
  }
  return advance;
}

export function repayAdvance(): void {
  try {
    localStorage.removeItem(ADVANCE_KEY);
  } catch {
    // fine; nothing to clean up if it never persisted
  }
}
