// Mock cooldown-withdrawal state for E3 (docs/BUILD-PLAN.md's fake data
// layer). Only one pending withdrawal at a time — same as the real vault,
// which tracks a single pending amount/releaseAt per user. Real requests
// replace this file entirely in E5.

import { getVaultSettings, DEFAULT_SETTINGS } from "./vault-settings";
import { recordWithdrawal } from "./mock-activity";

const PENDING_KEY = "ky_pending_withdrawal";

export type PendingWithdrawal = {
  amountUsdc: number;
  requestedAt: number; // epoch ms
  releaseAt: number; // epoch ms
};

export function getPendingWithdrawal(): PendingWithdrawal | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.amountUsdc !== "number" ||
      typeof parsed.requestedAt !== "number" ||
      typeof parsed.releaseAt !== "number"
    ) {
      return null;
    }
    return parsed as PendingWithdrawal;
  } catch {
    return null;
  }
}

/** Starts the cooldown. Cooldown length comes from the vault settings the
 * user picked in Setup (T3.1) — matches the real contract, which reads the
 * same per-vault cooldown at request time. */
export function requestWithdrawal(amountUsdc: number): PendingWithdrawal {
  const { cooldownSeconds } = getVaultSettings() ?? DEFAULT_SETTINGS;
  const now = Date.now();
  const pending: PendingWithdrawal = {
    amountUsdc,
    requestedAt: now,
    releaseAt: now + cooldownSeconds * 1000,
  };
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // fine without persistence; the request just won't stick on reload
  }
  return pending;
}

/** One tap, no penalty in the MVP (CLAUDE.md: "No penalty in the MVP"). */
export function cancelWithdrawal(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // fine; nothing to clean up if it never persisted
  }
}

/** Only valid once the countdown has actually reached zero — moves the
 * pending amount into mock-activity's completed-withdrawals total (so
 * getKeptBalance() reflects it) and clears the pending state. */
export function executeWithdrawal(): void {
  const pending = getPendingWithdrawal();
  if (!pending || Date.now() < pending.releaseAt) return;
  recordWithdrawal(pending.amountUsdc);
  cancelWithdrawal();
}
