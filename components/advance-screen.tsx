"use client";

import { useEffect, useState } from "react";
import { getKeptBalance } from "@/lib/mock-activity";
import {
  getOpenAdvance,
  getMaxAdvance,
  getFeeBps,
  getFeeOwed,
  isOverdue,
  requestAdvance,
  repayAdvance,
  FEE_TIERS,
  type Advance,
} from "@/lib/mock-advance";
import AmountKeypad, { type AmountPreset } from "./amount-keypad";

function formatUsdc(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function daysElapsed(takenAt: number, now: number): number {
  return Math.max(0, Math.floor((now - takenAt) / (24 * 60 * 60 * 1000)));
}

export default function AdvanceScreen() {
  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState(0);
  const [advance, setAdvance] = useState<Advance | null>(null);
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"amount" | "confirm">("amount");
  const [now, setNow] = useState(Date.now());

  function refresh() {
    setBalance(getKeptBalance());
    setAdvance(getOpenAdvance());
    // Re-sync "now" here too, not just from the interval below — otherwise
    // a freshly-confirmed advance's takenAt (set at confirm time) can be
    // later than a "now" still sitting at this component's mount time,
    // making daysElapsed briefly negative ("taken -1 days ago").
    setNow(Date.now());
  }

  useEffect(() => {
    setMounted(true);
    refresh();
  }, []);

  // Ticks every minute while an advance is open, just enough to move the
  // "days elapsed" / fee-tier display without a full per-second countdown.
  useEffect(() => {
    if (!advance) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [advance]);

  if (!mounted) return null;

  const max = getMaxAdvance();
  const value = Number(amount);
  const amountValid = Number.isFinite(value) && value > 0 && value <= max;

  const presets: AmountPreset[] =
    max > 0
      ? [
          { label: "25%", value: round2(max * 0.25) },
          { label: "50%", value: round2(max * 0.5) },
          { label: "75%", value: round2(max * 0.75) },
          { label: "Max", value: round2(max) },
        ]
      : [];

  function handleConfirm() {
    if (!amountValid) return;
    requestAdvance(value);
    setAmount("");
    setStep("amount");
    refresh();
  }

  function handleRepay() {
    repayAdvance();
    refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col gap-6 p-6 pb-10">
      <h1 className="font-display text-[22px] font-bold">Advance</h1>

      {!advance ? (
        step === "amount" ? (
          <section className="flex flex-col gap-5">
            <p className="text-center text-[13px] text-[#8CA497]">
              Up to 50% of savings:{" "}
              <span className="text-[#EAF5EF]">${formatUsdc(max)}</span>
              <br />
              from the advance pool, never other users&apos; savings
            </p>

            <div className="flex items-center justify-center gap-1 py-2 text-center">
              <p className="font-mono text-[40px] font-semibold text-[#EAF5EF]">
                ${amount || "0"}
              </p>
              <span className="h-[34px] w-[2px] animate-pulse bg-[#62E6A0]" aria-hidden="true" />
            </div>

            <div className="flex flex-col gap-2 rounded-[18px] border border-[#1E3428] p-4">
              <p className="text-[12px] text-[#8CA497]">Fee if not repaid before your next payment</p>
              {FEE_TIERS.map((tier) => (
                <div key={tier.label} className="flex items-center justify-between text-[13px]">
                  <span className="text-[#8CA497]">{tier.rangeLabel}</span>
                  <span className={tier.bps === 0 ? "text-[#62E6A0]" : "text-[#EAF5EF]"}>
                    {tier.label}
                  </span>
                </div>
              ))}
            </div>

            <AmountKeypad
              value={amount}
              onChange={setAmount}
              presets={presets}
              onConfirm={() => amountValid && setStep("confirm")}
              confirmDisabled={max <= 0 || !amountValid}
              confirmLabel="Review advance"
            />
          </section>
        ) : (
          <section className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-1 rounded-[24px] border border-[#1E3428] bg-[#12211A] p-6 text-center">
              <p className="text-[13px] text-[#8CA497]">You&apos;ll receive</p>
              <p className="font-mono text-[32px] font-semibold text-[#EAF5EF]">
                ${formatUsdc(value)}
              </p>
              <p className="text-[12px] text-[#8CA497]">to your spending balance, right away</p>
            </div>

            <div className="flex flex-col gap-2 rounded-[18px] border border-[#1E3428] p-4 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[#8CA497]">Fee today</span>
                <span className="text-[#62E6A0]">Free</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8CA497]">Repayment</span>
                <span className="text-[#EAF5EF]">Automatic, from your next payment</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8CA497]">Your savings</span>
                <span className="text-[#EAF5EF]">Stay locked as security until repaid</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-full bg-gradient-to-r from-[#16B862] to-[#62E6A0] py-3.5 text-[15px] font-semibold text-[#03170C]"
            >
              Confirm advance
            </button>
            <button
              type="button"
              onClick={() => setStep("amount")}
              className="text-[13px] text-[#8CA497] underline decoration-[#2C4A3B] underline-offset-4 hover:text-[#BFD8C9]"
            >
              Back
            </button>
          </section>
        )
      ) : (
        <section className="flex flex-col items-center gap-5">
          <div className="flex w-full flex-col items-center gap-2 rounded-[24px] border border-[#1E3428] bg-[#12211A] p-6 text-center">
            <p className="text-[13px] text-[#8CA497]">Open advance</p>
            <p className="font-mono text-[32px] font-semibold text-[#EAF5EF]">
              ${formatUsdc(advance.amountUsdc)}
            </p>
            <p className="text-[12px] text-[#8CA497]">
              taken {daysElapsed(advance.takenAt, now)} day{daysElapsed(advance.takenAt, now) === 1 ? "" : "s"} ago
            </p>
          </div>

          <div
            className={`flex w-full flex-col items-center gap-2 rounded-[24px] border p-6 text-center ${
              isOverdue(advance.takenAt, now)
                ? "border-[#FF7070]/30 bg-[#FF7070]/10"
                : "border-[#F4B545]/30 bg-[#F4B545]/10"
            }`}
          >
            <p className={`text-[13px] ${isOverdue(advance.takenAt, now) ? "text-[#FF7070]" : "text-[#F4B545]"}`}>
              {isOverdue(advance.takenAt, now) ? "Overdue" : "Fee if settled today"}
            </p>
            <p
              className={`font-mono text-[28px] font-semibold ${
                isOverdue(advance.takenAt, now) ? "text-[#FF7070]" : "text-[#F4B545]"
              }`}
            >
              {getFeeBps(advance.takenAt, now) === 0
                ? "Free"
                : `${(getFeeBps(advance.takenAt, now) / 100).toFixed(1)}% · $${formatUsdc(
                    getFeeOwed(advance, now)
                  )}`}
            </p>
            <p className="text-[12px] text-[#8CA497]">
              {isOverdue(advance.takenAt, now)
                ? "Past 90 days — settleable from your savings."
                : "Repaid automatically, before the split, on your next payment."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleRepay}
            className="w-full rounded-full border border-[#1E3428] py-3.5 text-[15px] font-semibold text-[#EAF5EF] hover:border-[#2C4A3B]"
          >
            Repay now (simulate)
          </button>
        </section>
      )}
    </main>
  );
}
