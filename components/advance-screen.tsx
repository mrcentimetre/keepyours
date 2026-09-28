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
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Badge } from "./ui/badge";

function formatUsdc(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function daysElapsed(takenAt: number, now: number): number {
  return Math.max(0, Math.floor((now - takenAt) / (24 * 60 * 60 * 1000)));
}

function AdvanceSkeleton() {
  return (
    <main className="flex min-h-dvh flex-col gap-6 p-6 pb-10">
      <Skeleton className="h-7 w-28" />
      <Skeleton className="mx-auto h-4 w-56" />
      <Skeleton className="mx-auto h-12 w-32" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-56 w-full rounded-2xl" />
    </main>
  );
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

  if (!mounted) return <AdvanceSkeleton />;

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
    <main className="flex min-h-dvh flex-col gap-6 p-6 pb-10 duration-500 animate-in fade-in slide-in-from-bottom-2">
      <h1 className="font-display text-[22px] font-bold">Advance</h1>

      {!advance ? (
        step === "amount" ? (
          <section className="flex flex-col gap-5">
            <p className="text-center text-[13px] text-muted-foreground">
              Up to 50% of savings: <span className="text-foreground">${formatUsdc(max)}</span>
              <br />
              from the advance pool, never other users&apos; savings
            </p>

            <div className="flex items-center justify-center gap-1 py-2 text-center">
              <p className="font-mono text-[40px] font-semibold text-foreground">${amount || "0"}</p>
              <span className="h-[34px] w-[2px] animate-pulse bg-primary" aria-hidden="true" />
            </div>

            <Card className="flex flex-col gap-2 p-4">
              <p className="text-[12px] text-muted-foreground">Fee if not repaid before your next payment</p>
              {FEE_TIERS.map((tier) => (
                <div key={tier.label} className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">{tier.rangeLabel}</span>
                  <span className={tier.bps === 0 ? "text-primary" : "text-foreground"}>{tier.label}</span>
                </div>
              ))}
            </Card>

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
            <Card className="flex flex-col items-center gap-1 p-6 text-center">
              <p className="text-[13px] text-muted-foreground">You&apos;ll receive</p>
              <p className="font-mono text-[32px] font-semibold text-foreground">${formatUsdc(value)}</p>
              <p className="text-[12px] text-muted-foreground">to your spending balance, right away</p>
            </Card>

            <Card className="flex flex-col gap-2 p-4 text-[13px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee today</span>
                <span className="text-primary">Free</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Repayment</span>
                <span className="text-foreground">Automatic, from your next payment</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your savings</span>
                <span className="text-foreground">Stay locked as security until repaid</span>
              </div>
            </Card>

            <Button onClick={handleConfirm}>Confirm advance</Button>
            <Button variant="link" onClick={() => setStep("amount")}>
              Back
            </Button>
          </section>
        )
      ) : (
        <section className="flex flex-col items-center gap-5">
          <Card className="flex w-full flex-col items-center gap-2 p-6 text-center">
            <p className="text-[13px] text-muted-foreground">Open advance</p>
            <p className="font-mono text-[32px] font-semibold text-foreground">
              ${formatUsdc(advance.amountUsdc)}
            </p>
            <p className="text-[12px] text-muted-foreground">
              taken {daysElapsed(advance.takenAt, now)} day{daysElapsed(advance.takenAt, now) === 1 ? "" : "s"} ago
            </p>
          </Card>

          <Card
            className={
              "flex w-full flex-col items-center gap-2 p-6 text-center " +
              (isOverdue(advance.takenAt, now) ? "border-destructive/30 bg-destructive/10" : "border-warning/30 bg-warning/10")
            }
          >
            <Badge variant={isOverdue(advance.takenAt, now) ? "destructive" : "warning"}>
              {isOverdue(advance.takenAt, now) ? "Overdue" : "Fee if settled today"}
            </Badge>
            <p
              className={
                "font-mono text-[28px] font-semibold " +
                (isOverdue(advance.takenAt, now) ? "text-destructive" : "text-warning")
              }
            >
              {getFeeBps(advance.takenAt, now) === 0
                ? "Free"
                : `${(getFeeBps(advance.takenAt, now) / 100).toFixed(1)}% · $${formatUsdc(
                    getFeeOwed(advance, now)
                  )}`}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {isOverdue(advance.takenAt, now)
                ? "Past 90 days — settleable from your savings."
                : "Repaid automatically, before the split, on your next payment."}
            </p>
          </Card>

          <Button onClick={handleRepay} variant="outline" className="w-full">
            Repay now (simulate)
          </Button>
        </section>
      )}
    </main>
  );
}
