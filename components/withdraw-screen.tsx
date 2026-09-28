"use client";

import { useEffect, useState } from "react";
import { getKeptBalance } from "@/lib/mock-activity";
import {
  getPendingWithdrawal,
  requestWithdrawal,
  cancelWithdrawal,
  executeWithdrawal,
  type PendingWithdrawal,
} from "@/lib/mock-withdrawal";
import AmountKeypad, { type AmountPreset } from "./amount-keypad";

function formatUsdc(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatCountdown(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function WithdrawScreen() {
  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState(0);
  const [pending, setPending] = useState<PendingWithdrawal | null>(null);
  const [amount, setAmount] = useState("");
  const [now, setNow] = useState(Date.now());

  function refresh() {
    setBalance(getKeptBalance());
    setPending(getPendingWithdrawal());
  }

  useEffect(() => {
    setMounted(true);
    refresh();
  }, []);

  // Live countdown — ticks every second while a withdrawal is pending.
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pending]);

  if (!mounted) return null;

  const releaseReached = pending ? now >= pending.releaseAt : false;
  const value = Number(amount);
  const amountValid = Number.isFinite(value) && value > 0 && value <= balance;

  const presets: AmountPreset[] =
    balance > 0
      ? [
          { label: "25%", value: round2(balance * 0.25) },
          { label: "50%", value: round2(balance * 0.5) },
          { label: "75%", value: round2(balance * 0.75) },
          { label: "Max", value: round2(balance) },
        ]
      : [];

  function handleRequest() {
    if (!amountValid) return;
    requestWithdrawal(value);
    setAmount("");
    refresh();
  }

  function handleCancel() {
    cancelWithdrawal();
    refresh();
  }

  function handleExecute() {
    executeWithdrawal();
    refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col gap-6 p-6 pb-10">
      <h1 className="font-display text-[22px] font-bold">Withdraw</h1>

      {!pending ? (
        <section className="flex flex-col gap-5">
          <p className="text-center text-[13px] text-[#8CA497]">
            Available: <span className="text-[#EAF5EF]">${formatUsdc(balance)}</span>
          </p>

          <div className="flex items-center justify-center gap-1 py-2 text-center">
            <p className="font-mono text-[40px] font-semibold text-[#EAF5EF]">
              ${amount || "0"}
            </p>
            <span className="h-[34px] w-[2px] animate-pulse bg-[#62E6A0]" aria-hidden="true" />
          </div>

          <AmountKeypad
            value={amount}
            onChange={setAmount}
            presets={presets}
            onConfirm={handleRequest}
            confirmDisabled={balance <= 0 || !amountValid}
            confirmLabel="Request withdrawal"
          />

          <p className="text-center text-[12px] text-[#8CA497]">
            Starts the waiting period set up for this vault. You can cancel any time before it
            ends, no penalty.
          </p>
        </section>
      ) : (
        <section className="flex flex-col items-center gap-5">
          <div className="flex w-full flex-col items-center gap-2 rounded-[24px] border border-[#1E3428] bg-[#12211A] p-6 text-center">
            <p className="text-[13px] text-[#8CA497]">Withdrawing</p>
            <p className="font-mono text-[32px] font-semibold text-[#EAF5EF]">
              ${formatUsdc(pending.amountUsdc)}
            </p>
            <p className="text-[12px] text-[#8CA497]">to your wallet address</p>
          </div>

          <div className="flex w-full flex-col items-center gap-2 rounded-[24px] border border-[#F4B545]/30 bg-[#F4B545]/10 p-6 text-center">
            <p className="text-[13px] text-[#F4B545]">
              {releaseReached ? "Waiting period over" : "Waiting period"}
            </p>
            <p className="font-mono text-[36px] font-semibold text-[#F4B545]">
              {releaseReached ? "00:00:00" : formatCountdown(pending.releaseAt - now)}
            </p>
            <p className="text-[12px] text-[#8CA497]">
              {releaseReached
                ? "Ready to send."
                : "An alert was sent. Cancel any time before it ends."}
            </p>
          </div>

          {releaseReached ? (
            <button
              type="button"
              onClick={handleExecute}
              className="w-full rounded-full bg-gradient-to-r from-[#16B862] to-[#62E6A0] py-3.5 text-[15px] font-semibold text-[#03170C]"
            >
              Send to my wallet
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCancel}
              className="w-full rounded-full border border-[#FF7070]/40 py-3.5 text-[15px] font-semibold text-[#FF7070] hover:border-[#FF7070]"
            >
              Cancel withdrawal
            </button>
          )}
        </section>
      )}
    </main>
  );
}
