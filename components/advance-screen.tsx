"use client";

import { reportError, track } from "@/lib/analytics";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { getCachedAddress } from "@/hooks/use-passkey-wallet";
import { useVault } from "@/hooks/use-vault";
import { advanceCall, maxAdvance, plainTxError, repayNowCalls, sendWithPasskey, type Call } from "@/lib/vault";
import { BadgeCheck, Loader2, Zap } from "lucide-react";
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
import { formatShortDate, formatUsdc } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Screen, ScreenHeader, Money, SectionLabel } from "./app/screen";
import { Contour } from "./app/contour";
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
  // A number, not the keypad's digit string: an advance is picked on a
  // slider within a known limit, not typed.
  const [amount, setAmount] = useState(0);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [owner, setOwner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [slideKey, setSlideKey] = useState(0);
  const { state: vault, refresh: refreshVault } = useVault(owner);

  // Real vault: savings, the open advance and its fee come from the chain.
  useEffect(() => {
    if (!vault) return;
    setBalance(vault.saved);
    setAdvance(vault.advance && { amountUsdc: vault.advance.principal, takenAt: vault.advance.startedAt });
    setNow(Date.now());
  }, [vault]);

  async function run(call: Call | Call[]): Promise<boolean> {
    setBusy(true);
    try {
      await sendWithPasskey(owner as Address, call);
      await refreshVault();
      return true;
    } catch (e) {
      toast.error(plainTxError(e));
      track("tx_failed", { action: "advance", reason: plainTxError(e) });
      reportError(e, "advance");
      setSlideKey((k) => k + 1);
      return false;
    } finally {
      setBusy(false);
    }
  }

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
    setOwner(getCachedAddress());
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

  const max = vault ? maxAdvance(vault) : getMaxAdvance();
  // One fee tier: 30 days on mainnet, minutes on the testnet deployment.
  const tierMs = vault ? vault.feePeriodSeconds * 1000 : 30 * DAY_MS;
  const value = Math.min(amount, max);
  const amountValid = value > 0;
  // Round dollar amounts under the limit, then the limit itself.
  const picks = [...[10, 25, 50, 100].filter((n) => n < max), round2(max)].slice(-4);

  async function borrow() {
    if (!amountValid) return;
    if (vault) {
      if (await run(advanceCall(vault.address, value.toFixed(2)))) {
        setAmount(0);
        setReviewOpen(false);
        toast.success(`$${formatUsdc(value)} sent to your wallet`);
        track("advance_taken");
      }
      return;
    }
    requestAdvance(value);
    setTimeout(() => {
      setAmount(0);
      setReviewOpen(false);
      refresh();
      toast.success(`$${formatUsdc(value)} is on its way to your spending balance`);
    }, 350);
  }

  async function repay() {
    if (vault?.advance) {
      if (await run(repayNowCalls(vault.address, vault.advance.owedNow))) {
        toast.success("Advance repaid");
        track("advance_repaid");
      }
      return;
    }
    repayAdvance();
    refresh();
    toast.success("Advance repaid");
  }

  // ── Open advance ────────────────────────────────────────────
  if (advance) {
    // "Days" scale with the tier length, so testnet shows the same 90-day story in minutes.
    // Capped at 90: past that the advance is simply due, however long ago it was.
    const day = Math.min(
      90,
      vault ? Math.max(0, Math.floor(((now - advance.takenAt) / tierMs) * 30)) : daysElapsed(advance.takenAt, now)
    );
    const overdue = vault ? now - advance.takenAt > 3 * tierMs : isOverdue(advance.takenAt, now);
    const feeBps = vault?.advance ? vault.advance.feeBps : getFeeBps(advance.takenAt, now);
    const feeOwed = vault?.advance ? Math.max(0, vault.advance.owedNow - vault.advance.principal) : getFeeOwed(advance, now);

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
            {overdue
              ? "Past day 90 · can now be settled from your savings"
              : `Taken ${day === 0 ? "today" : `${day} day${day === 1 ? "" : "s"} ago`} · day ${day + 1} of 90`}
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
                <span className="text-warning">${formatUsdc(feeOwed)}</span>
              )}
            </Row>
            <Row label="Repayment">Next payment, before the split</Row>
            <Row label="After day 90">Settled from savings</Row>
          </CardRows>
        </Card>

        <Button onClick={repay} disabled={busy} variant="outline" className="w-full">
          {busy && <Loader2 className="animate-spin" />}
          {vault ? `Repay $${formatUsdc(vault.advance?.owedNow ?? 0)} now from my wallet` : "Repay now (simulate)"}
        </Button>
      </Screen>
    );
  }

  // ── Entry ───────────────────────────────────────────────────
  return (
    <Screen className="gap-5">
      <ScreenHeader title="Advance" subtitle="Borrow against your own savings" />

      {/* The limit as a card you hold — a credit line, not a form field.
          min-h, not a fixed aspect ratio: the fixed height clipped the last
          line of text off the bottom on a phone. */}
      <div
        className="relative min-h-[200px] overflow-hidden rounded-[26px] p-5 text-white shadow-float ring-1 ring-white/10"
        style={{ background: "var(--hero-card)" }}
      >
        <Contour variant="banner" position="75% 50%" />
        <div className="relative flex min-h-[160px] flex-col justify-between gap-6">
          <div className="flex items-start justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] uppercase ring-1 ring-white/20 backdrop-blur-md">
              <Zap className="size-3.5" /> Advance line
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-128.png" alt="" width={30} height={30} />
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-[0.12em] text-white/65 uppercase">Available now</p>
            <Money value={max} className="mt-1 block text-[34px] leading-none font-semibold" centsClassName="text-[22px]" />
            <p className="mt-2 text-[12px] text-white/70">
              Half of your ${formatUsdc(balance)} savings · paid from the advance pool
            </p>
          </div>
        </div>
      </div>

      {max <= 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
            <Zap className="size-5" />
          </span>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Advances are backed by your savings. Once you&apos;ve kept some, you can borrow up to half of it here.
          </p>
        </Card>
      ) : (
        <>
          <Card className="p-5">
            <div className="flex items-baseline justify-between">
              <SectionLabel>How much</SectionLabel>
              <span className="text-[12px] text-muted-foreground">up to ${formatUsdc(max)}</span>
            </div>
            <Money
              value={value}
              className="mt-2 block text-center text-[44px] leading-none font-semibold"
              centsClassName="text-[28px]"
            />
            <input
              type="range"
              min={0}
              max={max}
              step={1}
              value={value}
              onChange={(e) => setAmount(Number(e.target.value))}
              aria-label="Advance amount"
              aria-valuetext={`${formatUsdc(value)} dollars`}
              className="ky-fill mt-5 w-full cursor-pointer"
              style={{ "--fill": `${max > 0 ? (value / max) * 100 : 0}%` } as React.CSSProperties}
            />
            <div className="mt-3 grid grid-cols-4 gap-2">
              {picks.map((p, i) => {
                const isMax = i === picks.length - 1;
                const active = Math.abs(value - p) < 0.005;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p)}
                    className={cn(
                      "h-10 rounded-xl text-[13px] font-semibold transition-all active:scale-95",
                      active ? "bg-primary text-primary-foreground" : "bg-surface-2 text-foreground/85 hover:bg-secondary"
                    )}
                  >
                    {isMax ? "Max" : `$${p}`}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* What it costs, as dates — the thing to know before borrowing. */}
          <Card className="p-5">
            <SectionLabel className="mb-4">If you don&apos;t get paid for a while</SectionLabel>
            <ol className="relative flex flex-col gap-4 pl-6">
              <span aria-hidden="true" className="absolute top-2 bottom-2 left-[7px] w-0.5 rounded-full bg-surface-2" />
              {[
                { dot: "bg-primary", title: "Free", when: `until ${formatShortDate(now + tierMs)}`, cost: "$0.00" },
                {
                  dot: "bg-warning/70",
                  title: "1.5% fee",
                  when: `until ${formatShortDate(now + 2 * tierMs)}`,
                  cost: `$${formatUsdc(round2(value * 0.015))}`,
                },
                {
                  dot: "bg-warning",
                  title: "3% fee",
                  when: `until ${formatShortDate(now + 3 * tierMs)}`,
                  cost: `$${formatUsdc(round2(value * 0.03))}`,
                },
              ].map((s) => (
                <li key={s.title} className="relative flex items-center justify-between">
                  <span className={cn("absolute top-1/2 -left-6 size-4 -translate-y-1/2 rounded-full ring-4 ring-card", s.dot)} />
                  <span>
                    <span className="block text-[14px] font-semibold">{s.title}</span>
                    <span className="block text-[12px] text-muted-foreground">{s.when}</span>
                  </span>
                  <span className="font-mono text-[14px] text-muted-foreground tabular-nums">{s.cost}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
              <BadgeCheck className="size-4 shrink-0 text-primary" />
              Your next payment repays it first, before the split.
            </p>
          </Card>

          <Button onClick={() => amountValid && setReviewOpen(true)} disabled={!amountValid} className="w-full">
            {amountValid ? `Borrow $${formatUsdc(value)}` : "Choose an amount"}
          </Button>
        </>
      )}

      <Sheet open={reviewOpen} onOpenChange={setReviewOpen}>
        <SheetContent title="Review advance">
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <Money value={value || 0} className="block text-[40px] font-semibold" centsClassName="text-[26px]" />
              <p className="mt-1 text-[13px] text-muted-foreground">to your wallet, right away</p>
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
            {busy ? (
              <Button size="lg" disabled className="w-full">
                <Loader2 className="animate-spin" />
                Borrowing…
              </Button>
            ) : (
              <SlideToConfirm key={slideKey} label="Slide to borrow" onConfirm={borrow} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </Screen>
  );
}
