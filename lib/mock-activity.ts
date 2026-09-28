// Mock payment ledger for E3 (docs/BUILD-PLAN.md's fake data layer). Starts
// EMPTY on purpose — never pre-seeded with fake payments. CLAUDE.md's "never
// invent traction" rule is about marketing copy, but the same principle
// applies here: this screen gets screenshotted, and a fake "someone paid
// you $250" would be exactly the kind of invented activity that rule exists
// to prevent. Real payments replace this file entirely in E5.

const PAYMENTS_KEY = "ky_mock_payments";

export type Payment = {
  id: string;
  totalUsdc: number;
  spentUsdc: number;
  keptUsdc: number;
  at: number; // epoch ms
};

export function getPayments(): Payment[] {
  try {
    const raw = localStorage.getItem(PAYMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Clearly a simulation, never called automatically — only from a button
 * labelled as one. Splits by the vault's configured keepBps. */
export function addSimulatedPayment(totalUsdc: number, keepBps: number): Payment {
  const keptUsdc = Math.round(totalUsdc * (keepBps / 10000) * 100) / 100;
  const payment: Payment = {
    id: crypto.randomUUID(),
    totalUsdc,
    spentUsdc: Math.round((totalUsdc - keptUsdc) * 100) / 100,
    keptUsdc,
    at: Date.now(),
  };
  const payments = [payment, ...getPayments()];
  try {
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
  } catch {
    // fine without persistence; the payment just won't stick on reload
  }
  return payment;
}

const WITHDRAWALS_KEY = "ky_mock_withdrawals";

export function getWithdrawnTotal(): number {
  try {
    const raw = localStorage.getItem(WITHDRAWALS_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.reduce((sum: number, n: number) => sum + n, 0) : 0;
  } catch {
    return 0;
  }
}

/** Called once a pending withdrawal (lib/mock-withdrawal.ts) actually
 * releases — moves it from "pending" into the completed total that
 * getKeptBalance() subtracts, same relationship as the real contract's
 * saved/withdrawn accounting. */
export function recordWithdrawal(amountUsdc: number): void {
  try {
    const withdrawals = [...getPastWithdrawals(), amountUsdc];
    localStorage.setItem(WITHDRAWALS_KEY, JSON.stringify(withdrawals));
  } catch {
    // fine without persistence; balance just won't reflect it on reload
  }
}

function getPastWithdrawals(): number[] {
  try {
    const raw = localStorage.getItem(WITHDRAWALS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getKeptBalance(): number {
  const kept = getPayments().reduce((sum, p) => sum + p.keptUsdc, 0);
  return Math.round((kept - getWithdrawnTotal()) * 100) / 100;
}

export function getSpentTotal(): number {
  return getPayments().reduce((sum, p) => sum + p.spentUsdc, 0);
}
