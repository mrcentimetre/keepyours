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

export function getKeptBalance(): number {
  return getPayments().reduce((sum, p) => sum + p.keptUsdc, 0);
}

export function getSpentTotal(): number {
  return getPayments().reduce((sum, p) => sum + p.spentUsdc, 0);
}
