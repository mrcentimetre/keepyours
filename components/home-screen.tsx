"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpFromLine,
  Bell,
  ChevronRight,
  Copy,
  Lock,
  Plus,
  QrCode as QrIcon,
  Timer,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { getCachedAddress } from "@/hooks/use-passkey-wallet";
import { getVaultSettings, DEFAULT_SETTINGS, type VaultSettings } from "@/lib/vault-settings";
import {
  getPayments,
  getKeptBalance,
  getSpentTotal,
  addSimulatedPayment,
  type Payment,
} from "@/lib/mock-activity";
import { getPendingWithdrawal, type PendingWithdrawal } from "@/lib/mock-withdrawal";
import { getOpenAdvance, type Advance } from "@/lib/mock-advance";
import { formatUsdc, formatCooldownAdj, formatCountdown, shorten, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Money, SectionLabel, WalletAvatar } from "./app/screen";
import { Card, CardRows } from "./ui/card";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Sheet, SheetContent } from "./ui/sheet";
import GetPaidSheet from "./get-paid-sheet";

function HeroAction({
  href,
  onClick,
  icon,
  label,
  primary,
}: {
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  const inner = (
    <>
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-full transition-transform duration-150 group-active:scale-90",
          primary
            ? "bg-[#eaf5ef] text-[#060e0a] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)]"
            : "bg-white/12 text-white ring-1 ring-white/20 backdrop-blur-md"
        )}
      >
        {icon}
      </span>
      <span className="text-[12px] font-semibold text-white/85">{label}</span>
    </>
  );
  const className = "group flex flex-col items-center gap-2";
  return href ? (
    <Link href={href} className={className}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

/** Something in progress that deserves the top of the screen — a
 * withdrawal counting down, an advance open. Amber means waiting
 * (CLAUDE.md's brand rule), so the withdrawal tile is amber. */
function StatusTile({
  href,
  tone,
  icon,
  title,
  detail,
}: {
  href: string;
  tone: "warning" | "primary";
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-[20px] p-4 ring-1 transition-transform active:scale-[0.99]",
        tone === "warning" ? "bg-warning/10 ring-warning/25" : "bg-primary/10 ring-primary/25"
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          tone === "warning" ? "bg-warning/15 text-warning" : "bg-primary/15 text-primary"
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold">{title}</span>
        <span className="block font-mono text-[12px] text-muted-foreground tabular-nums">{detail}</span>
      </span>
      <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

function SplitTile({
  label,
  value,
  pct,
  tone,
}: {
  label: string;
  value: number;
  pct: number;
  tone: "spend" | "keep";
}) {
  return (
    <Card className="relative overflow-hidden p-4">
      {/* A radial gradient, not a blurred circle: iOS Safari doesn't clip a
          blur() child to its parent's rounded corner, which squared off the
          tile's top-right corner. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute -top-10 -right-10 size-32",
          tone === "keep"
            ? "bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--primary)_25%,transparent),transparent)]"
            : "bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--accent)_15%,transparent),transparent)]"
        )}
      />
      <SectionLabel>{label}</SectionLabel>
      <Money value={value} className="mt-2 block text-[22px] font-semibold" />
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div
            className={cn("h-full rounded-full", tone === "keep" ? "bg-primary" : "bg-accent")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={cn("text-[11px] font-bold", tone === "keep" ? "text-primary" : "text-accent")}>
          {pct}%
        </span>
      </div>
    </Card>
  );
}

function HomeSkeleton() {
  return (
    <main className="flex min-h-dvh flex-col">
      <div className="rounded-b-[32px] bg-surface-2/60 px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-7">
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-7 w-56 rounded-full" />
        </div>
        <div className="mt-8 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Skeleton className="size-14 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4 px-5 pt-6">
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-48" />
      </div>
    </main>
  );
}

export default function HomeScreen() {
  const [mounted, setMounted] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [settings, setSettings] = useState<VaultSettings>(DEFAULT_SETTINGS);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pending, setPending] = useState<PendingWithdrawal | null>(null);
  const [advance, setAdvance] = useState<Advance | null>(null);
  const [now, setNow] = useState(Date.now());
  const [getPaidOpen, setGetPaidOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  function refresh() {
    setPayments(getPayments());
    setPending(getPendingWithdrawal());
    setAdvance(getOpenAdvance());
    setNow(Date.now());
  }

  useEffect(() => {
    setMounted(true);
    setAddress(getCachedAddress());
    setSettings(getVaultSettings() ?? DEFAULT_SETTINGS);
    refresh();
  }, []);

  // Only tick while there's a countdown on screen.
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pending]);

  if (!mounted) return <HomeSkeleton />;

  const keepPct = Math.round(settings.keepBps / 100);
  const spendPct = 100 - keepPct;
  const kept = getKeptBalance();
  const spent = getSpentTotal();

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied");
    } catch {
      toast.error("Couldn't copy — open Get paid and copy it there");
    }
  }

  function simulatePayment() {
    const p = addSimulatedPayment(100, settings.keepBps);
    refresh();
    toast.success(`$100 test payment split: $${formatUsdc(p.spentUsdc)} to spend, $${formatUsdc(p.keptUsdc)} kept`);
  }

  const alerts = [
    pending && {
      icon: <Timer className="size-4" />,
      title: `Withdrawal of $${formatUsdc(pending.amountUsdc)} requested`,
      at: pending.requestedAt,
    },
    advance && {
      icon: <Zap className="size-4" />,
      title: `Advance of $${formatUsdc(advance.amountUsdc)} taken`,
      at: advance.takenAt,
    },
  ].filter(Boolean) as { icon: React.ReactNode; title: string; at: number }[];

  return (
    <main className="flex min-h-dvh flex-col duration-300 animate-in fade-in">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden rounded-b-[32px] px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-7 text-white shadow-float ring-1 ring-white/[0.07]"
        style={{ background: "var(--hero)" }}
      >
        <div className="relative flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <WalletAvatar address={address} size={44} />
            <div className="min-w-0">
              <p className="text-[12px] text-white/65">Welcome back</p>
              <p className="truncate font-mono text-[14px] font-semibold">
                {address ? shorten(address) : "Keep Yours"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="glass"
              size="icon"
              className="relative size-11"
              onClick={() => setAlertsOpen(true)}
              aria-label="Notifications"
            >
              <Bell />
              {alerts.length > 0 && (
                <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-warning ring-2 ring-[#0d4429]" />
              )}
            </Button>
          </div>
        </div>

        <div className="relative mt-8 flex flex-col items-center text-center">
          <SectionLabel className="text-white/65">Total kept</SectionLabel>
          <Money value={kept} className="mt-2 text-[48px] leading-none font-semibold" centsClassName="text-[32px]" />
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-[12px] font-semibold ring-1 ring-white/20 backdrop-blur-md">
            <Lock className="size-3.5" aria-hidden="true" />
            Keeps {keepPct}% · {formatCooldownAdj(settings.cooldownSeconds)} waiting period
          </span>
        </div>

        <div className="relative mt-8 grid grid-cols-4 gap-2">
          <HeroAction primary onClick={() => setGetPaidOpen(true)} icon={<QrIcon className="size-6" />} label="Get paid" />
          <HeroAction href="/app/withdraw" icon={<ArrowUpFromLine className="size-6" />} label="Withdraw" />
          <HeroAction href="/app/advance" icon={<Zap className="size-6" />} label="Advance" />
          <HeroAction onClick={copyAddress} icon={<Copy className="size-6" />} label="Copy" />
        </div>
      </section>

      <div className="flex flex-col gap-6 px-5 pt-6">
        {/* ── In progress ───────────────────────────────────── */}
        {(pending || advance) && (
          <div className="flex flex-col gap-3">
            {pending && (
              <StatusTile
                href="/app/withdraw"
                tone="warning"
                icon={<Timer className="size-5" />}
                title="Withdrawal waiting"
                detail={
                  now >= pending.releaseAt
                    ? `$${formatUsdc(pending.amountUsdc)} · ready to send`
                    : `$${formatUsdc(pending.amountUsdc)} · ${formatCountdown(pending.releaseAt - now)} left`
                }
              />
            )}
            {advance && (
              <StatusTile
                href="/app/advance"
                tone="primary"
                icon={<Zap className="size-5" />}
                title="Advance open"
                detail={`$${formatUsdc(advance.amountUsdc)} · repaid from your next payment`}
              />
            )}
          </div>
        )}

        {/* ── Split ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <SplitTile label="To spend" value={spent} pct={spendPct} tone="spend" />
          <SplitTile label="Kept" value={kept} pct={keepPct} tone="keep" />
        </div>

        {/* ── Activity ──────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[18px] font-extrabold tracking-[-0.02em]">Activity</h2>
            <Button variant="secondary" size="sm" onClick={simulatePayment}>
              <Plus className="size-4" />
              Test payment
            </Button>
          </div>

          {payments.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 px-6 py-9 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-primary/12 text-primary">
                <QrIcon className="size-6" />
              </span>
              <div>
                <p className="text-[15px] font-semibold">No payments yet</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  Share your address with a client. Each payment splits the moment it lands.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setGetPaidOpen(true)} className="mt-1">
                Show my QR
              </Button>
            </Card>
          ) : (
            <Card>
              <CardRows>
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                      <ArrowDownLeft className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold">Payment received</p>
                      <p className="text-[12px] text-muted-foreground">{timeAgo(p.at, now)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[14px] font-semibold tabular-nums">+${formatUsdc(p.totalUsdc)}</p>
                      <p className="font-mono text-[11.5px] text-primary tabular-nums">${formatUsdc(p.keptUsdc)} kept</p>
                    </div>
                  </div>
                ))}
              </CardRows>
            </Card>
          )}
        </section>
      </div>

      <GetPaidSheet open={getPaidOpen} onOpenChange={setGetPaidOpen} address={address} />

      <Sheet open={alertsOpen} onOpenChange={setAlertsOpen}>
        <SheetContent title="Notifications">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
                <Bell className="size-5" />
              </span>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Nothing yet. Withdrawal requests and advances show up here.
              </p>
            </div>
          ) : (
            <Card className="bg-surface-2/50">
              <CardRows>
                {alerts.map((a) => (
                  <div key={a.title} className="flex items-center gap-3 px-4 py-3.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
                      {a.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold">{a.title}</p>
                      <p className="text-[12px] text-muted-foreground">{timeAgo(a.at, now)}</p>
                    </div>
                  </div>
                ))}
              </CardRows>
            </Card>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}
