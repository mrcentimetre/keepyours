"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Zap } from "lucide-react";
import { toast } from "sonner";
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
import { formatUsdc } from "@/lib/format";
import { cn } from "@/lib/utils";
import AmountKeypad, { AmountDisplay, AmountPresets, type AmountPreset } from "./amount-keypad";
import { Screen, ScreenHeader, Money, SectionLabel } from "./app/screen";
import SlideToConfirm from "./slide-to-confirm";
import { Card, CardRows } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Sheet, SheetContent } from "./ui/sheet";

const DAY_MS = 24 * 60 * 60 * 1000;
const TIER_COLORS = ["bg-primary", "bg-warning/60", "bg-warning"] as const;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function daysElapsed(takenAt: number, now: number): number {
  return Math.max(0, Math.floor((now - takenAt) / DAY_MS));
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 text-[14px]">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

/** The 90-day fee schedule as three segments, with an optional marker for
 * where an open advance sits today. */
function FeeTimeline({ day }: { day?: number }) {
  return (
    <div>
      <div className="relative">
        <div className="flex h-2 gap-1 overflow-hidden rounded-full">
          {FEE_TIERS.map((t, i) => (
            <div key={t.label} className={cn("flex-1", TIER_COLORS[i])} />
          ))}
        </div>
        {day !== undefined && (
          <span
            aria-hidden="true"
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-4 ring-card"
            style={{ left: `${Math.min(100, (day / 90) * 100)}%` }}
          />
        )}
      </div>
      <div className="mt-2.5 grid grid-cols-3 text-[11.5px]">
        {FEE_TIERS.map((t, i) => (
          <div key={t.label} className={i === 1 ? "text-center" : i === 2 ? "text-right" : ""}>
            <p className={cn("font-bold", i === 0 ? "text-primary" : "text-warning")}>{t.label}</p>
            <p className="text-muted-foreground">{t.rangeLabel}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdvanceSkeleton() {
  return (
    <Screen>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-[120px]" />
      <Skeleton className="mx-auto h-14 w-44" />
      <Skeleton className="h-[270px]" />
    </Screen>
  );
}

export default function AdvanceScreen() {
  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState(0);
  const [advance, setAdvance] = useState<Advance | null>(null);
  const [amount, setAmount] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
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

  // Ticks every minute while an advance is open — enough to move the day
  // counter and fee tier without a per-second countdown.
  useEffect(() => {
    if (!advance) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [advance]);

  if (!mounted) return <AdvanceSkeleton />;

  const max = getMaxAdvance();
  const value = Number(amount);
  const overMax = value > max;
  const amountValid = Number.isFinite(value) && value > 0 && !overMax;

  const presets: AmountPreset[] =
    max > 0
      ? [
          { label: "25%", value: round2(max * 0.25) },
          { label: "50%", value: round2(max * 0.5) },
          { label: "75%", value: round2(max * 0.75) },
          { label: "Max", value: round2(max) },
        ]
      : [];

  function borrow() {
    if (!amountValid) return;
    requestAdvance(value);
    setTimeout(() => {
      setAmount("");
      setReviewOpen(false);
      refresh();
      toast.success(`$${formatUsdc(value)} is on its way to your spending balance`);
    }, 350);
  }

  function repay() {
    repayAdvance();
    refresh();
    toast.success("Advance repaid");
  }

  // ── Open advance ────────────────────────────────────────────
  if (advance) {
    const day = daysElapsed(advance.takenAt, now);
    const overdue = isOverdue(advance.takenAt, now);
    const feeBps = getFeeBps(advance.takenAt, now);

    return (
      <Screen>
        <ScreenHeader title="Advance" subtitle="Repaid automatically from your next payment" />

        <Card className="relative overflow-hidden p-5">
          <span aria-hidden="true" className="absolute -top-10 -right-10 size-32 rounded-full bg-primary/20 blur-3xl" />
          <div className="flex items-start justify-between">
            <SectionLabel>Open advance</SectionLabel>
            <Badge variant={overdue ? "destructive" : feeBps === 0 ? "default" : "warning"}>
              {overdue ? "Overdue" : feeBps === 0 ? "Free right now" : `${(feeBps / 100).toFixed(1)}% fee`}
            </Badge>
          </div>
          <Money value={advance.amountUsdc} className="mt-2 block text-[40px] leading-none font-semibold" centsClassName="text-[26px]" />
          <p className="mt-2 text-[13px] text-muted-foreground">
            Taken {day === 0 ? "today" : `${day} day${day === 1 ? "" : "s"} ago`} · day {day + 1} of 90
          </p>
          <div className="mt-6">
            <FeeTimeline day={day} />
          </div>
        </Card>

        <Card>
          <CardRows>
            <Row label="Fee if repaid today">
              {feeBps === 0 ? (
                <span className="text-primary">Free</span>
              ) : (
                <span className="text-warning">${formatUsdc(getFeeOwed(advance, now))}</span>
              )}
            </Row>
            <Row label="Repayment">Next payment, before the split</Row>
            <Row label="After day 90">Settled from savings</Row>
          </CardRows>
        </Card>

        <Button onClick={repay} variant="outline" className="w-full">
          Repay now (simulate)
        </Button>
      </Screen>
    );
  }

  // ── Entry ───────────────────────────────────────────────────
  return (
    <Screen className="gap-5">
      <ScreenHeader title="Advance" subtitle="Borrow against your own savings" />

      <Card className="relative overflow-hidden p-5">
        <span aria-hidden="true" className="absolute -top-10 -right-10 size-32 rounded-full bg-primary/20 blur-3xl" />
        <div className="flex items-start justify-between">
          <div>
            <SectionLabel>Available now</SectionLabel>
            <Money value={max} className="mt-1.5 block text-[28px] leading-none font-semibold" centsClassName="text-[20px]" />
          </div>
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Zap className="size-5" />
          </span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-primary to-accent" />
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
          50% of ${formatUsdc(balance)} savings · from the advance pool, never other users&apos; savings
        </p>
      </Card>

      <div className="flex flex-col items-center gap-1 py-1">
        <AmountDisplay value={amount} invalid={overMax} />
        <p className={"flex items-center gap-1.5 text-[12.5px] " + (overMax ? "text-destructive" : "text-muted-foreground")}>
          {overMax ? (
            <>Up to ${formatUsdc(max)} right now</>
          ) : (
            <>
              <BadgeCheck className="size-3.5 text-primary" />
              Free for the first 30 days
            </>
          )}
        </p>
      </div>

      <AmountPresets presets={presets} value={amount} onPick={setAmount} />

      <AmountKeypad
        value={amount}
        onChange={setAmount}
        onConfirm={() => amountValid && setReviewOpen(true)}
        confirmDisabled={!amountValid}
        confirmLabel="Review advance"
      />

      <Sheet open={reviewOpen} onOpenChange={setReviewOpen}>
        <SheetContent title="Review advance">
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <Money value={value || 0} className="block text-[40px] font-semibold" centsClassName="text-[26px]" />
              <p className="mt-1 text-[13px] text-muted-foreground">to your spending balance, right away</p>
            </div>
            <Card className="bg-surface-2/50 p-4">
              <SectionLabel className="mb-3">Fee schedule</SectionLabel>
              <FeeTimeline />
            </Card>
            <Card className="bg-surface-2/50">
              <CardRows>
                <Row label="Fee today">
                  <span className="text-primary">Free</span>
                </Row>
                <Row label="Repayment">Next payment, before the split</Row>
                <Row label="Your savings">Locked until repaid</Row>
              </CardRows>
            </Card>
            <SlideToConfirm label="Slide to borrow" onConfirm={borrow} />
          </div>
        </SheetContent>
      </Sheet>
    </Screen>
  );
}
