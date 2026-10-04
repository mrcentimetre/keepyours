"use client";

import { track } from "@/lib/analytics";
import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpFromLine,
  Bell,
  Send,
  Lock,
  Plus,
  QrCode as QrIcon,
  Timer,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { getCachedAddress } from "@/hooks/use-passkey-wallet";
import { isHydrated } from "@/lib/hydrated";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { useVault } from "@/hooks/use-vault";
import { useActivity } from "@/hooks/use-activity";
import { useNotificationPermission } from "@/hooks/use-notification-permission";
import { registerPush } from "@/lib/push";
import ActivityList from "./activity-list";
import { BusyCoin } from "./app/busy-coin";
import InProgressCard, { humanDuration } from "./app/in-progress-card";
import { AdvanceIcon, CooldownIcon, SplitIcon } from "./waitlist/feature-icons";
import { isVaultConfigured, plainTxError, processCall, sendWithPasskey } from "@/lib/vault";
import type { Address } from "viem";
import { getVaultSettings, DEFAULT_SETTINGS, type VaultSettings } from "@/lib/vault-settings";
import {
  getPayments,
  getKeptBalance,
  addSimulatedPayment,
  type Payment,
} from "@/lib/mock-activity";
import { getPendingWithdrawal, type PendingWithdrawal } from "@/lib/mock-withdrawal";
import { getOpenAdvance, type Advance } from "@/lib/mock-advance";
import { formatUsdc, formatCooldownAdj, shorten, timeAgo } from "@/lib/format";
import { Contour } from "./app/contour";
import { cn } from "@/lib/utils";
import { Money, SectionLabel, WalletAvatar } from "./app/screen";
import { Card, CardRows } from "./ui/card";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Sheet, SheetContent } from "./ui/sheet";
import GetPaidSheet from "./get-paid-sheet";
import ProfileSheet from "./profile-sheet";
import { useProfileName } from "@/hooks/use-profile-name";

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
    <Link href={href} className={className} transitionTypes={["nav-forward"]}>
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
  // Coming back to Home (not the first open): everything is cached, so render
  // it straight away instead of flashing a skeleton.
  const [returning] = useState(isHydrated);
  const [mounted, setMounted] = useState(returning);
  const [address, setAddress] = useState<string | null>(() => (returning ? getCachedAddress() : null));
  const [settings, setSettings] = useState<VaultSettings>(() =>
    returning ? (getVaultSettings() ?? DEFAULT_SETTINGS) : DEFAULT_SETTINGS
  );
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pending, setPending] = useState<PendingWithdrawal | null>(null);
  const [advance, setAdvance] = useState<Advance | null>(null);
  const [now, setNow] = useState(Date.now());
  const [getPaidOpen, setGetPaidOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const name = useProfileName();
  const [alertsOpen, setAlertsOpen] = useState(false);
  // Spendable money is real: read from the chain, not the mock layer.
  const { balance: walletBalance, refresh: refreshWallet } = useUsdcBalance(address);
  // Savings are real once the vault exists; until then the mock layer fills in.
  const { payTo, state: vault, refresh: refreshVault, autoSplitFailed } = useVault(address);
  const [splitting, setSplitting] = useState(false);
  const { items: activity, unread, seenAt, markSeen } = useActivity(address, vault?.address ?? null);
  const { permission, ask } = useNotificationPermission();

  // With notifications allowed, register this phone for push so the keeper
  // can reach it while the app is closed. Re-run on each open: cheap, idempotent.
  const vaultAddress = vault?.address ?? null;
  useEffect(() => {
    if (vaultAddress && permission === "granted") registerPush(vaultAddress);
  }, [vaultAddress, permission]);

  // Tick "2 min ago" labels while there's live activity on screen.
  useEffect(() => {
    if (!activity) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [activity]);

  // Before paint, so the in-progress cards are there on the first frame.
  useLayoutEffect(() => {
    if (!vault) return;
    setSettings({ keepBps: vault.keepBps, cooldownSeconds: vault.cooldownSeconds });
    setPending(vault.pending && { amountUsdc: vault.pending.amount, requestedAt: vault.pending.requestedAt, releaseAt: vault.pending.releaseAt });
    setAdvance(vault.advance && { amountUsdc: vault.advance.principal, takenAt: vault.advance.startedAt });
  }, [vault]);

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
    // The mock layer only stands in when no contracts are configured; loading
    // it next to a real vault made the cards blink out and back in.
    if (isVaultConfigured()) setNow(Date.now());
    else refresh();
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
  const kept = vault ? vault.saved : getKeptBalance();
  const spendable = walletBalance ?? 0;

  async function splitNow() {
    if (!vault) return;
    setSplitting(true);
    try {
      await sendWithPasskey(address as Address, processCall(vault.address));
      toast.success("Split done");
      track("payment_split", { by: "manual" });
      await Promise.all([refreshVault(), refreshWallet()]);
    } catch (e) {
      toast.error(plainTxError(e));
    } finally {
      setSplitting(false);
    }
  }

  function simulatePayment() {
    const p = addSimulatedPayment(100, settings.keepBps);
    refresh();
    toast.success(`$100 test payment split: $${formatUsdc(p.spentUsdc)} to spend, $${formatUsdc(p.keptUsdc)} kept`);
  }

  // First tap on the bell asks for notifications (native prompt), then opens the list.
  async function openAlerts() {
    if (permission === "default") await ask();
    setNow(Date.now());
    setAlertsOpen(true);
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
    <main className={cn("flex min-h-dvh flex-col bg-background", !returning && "duration-300 animate-in fade-in")}>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden rounded-b-[32px] px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-7 text-white shadow-float ring-1 ring-white/[0.07]"
        style={{ background: "var(--hero)" }}
      >
        <Contour position="50% 30%" />
        <div className="relative flex items-center justify-between">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            aria-label="Open profile"
            className="flex min-w-0 items-center gap-3 rounded-full text-left transition-transform active:scale-[0.97]"
          >
            <WalletAvatar address={address} size={44} />
            <div className="min-w-0">
              <p className="text-[12px] text-white/65">Welcome back</p>
              {name ? (
                <p className="truncate text-[15px] font-semibold">{name}</p>
              ) : (
                <p className="truncate font-mono text-[14px] font-semibold">
                  {payTo ? shorten(payTo) : "Keep Yours"}
                </p>
              )}
            </div>
          </button>
          <div className="flex gap-2">
            <Button
              variant="glass"
              size="icon"
              className="relative size-11"
              onClick={openAlerts}
              aria-label="Notifications"
            >
              <Bell />
              {(vault ? unread > 0 : alerts.length > 0) && (
                <span aria-label="New activity" className="absolute top-2.5 right-2.5 size-2 rounded-full bg-white shadow-[0_0_6px_rgba(98,230,160,0.9)]" />
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
          <HeroAction href="/app/send" icon={<Send className="size-6" />} label="Send" />
        </div>
      </section>

      <div className="flex flex-col gap-6 px-5 pt-6">
        {/* ── Arrived, not split yet ────────────────────────── */}
        {vault && vault.unprocessed > 0 && (
          <div className="flex items-center gap-3.5 rounded-[22px] bg-card p-4 shadow-sm ring-1 ring-hairline">
            <SplitIcon className="size-12 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-muted-foreground">Payment arrived</span>
              <span className="block font-mono text-[22px] leading-tight font-semibold tracking-[-0.02em] tabular-nums">
                ${formatUsdc(vault.unprocessed)}
              </span>
              <span className="block text-[12px] text-muted-foreground">
                {autoSplitFailed ? "Couldn't split it automatically" : `Splitting it ${spendPct}/${keepPct}…`}
              </span>
            </span>
            {autoSplitFailed ? (
              <Button size="sm" onClick={splitNow} disabled={splitting}>
                {splitting && <BusyCoin />}
                {splitting ? "Splitting" : "Split now"}
              </Button>
            ) : (
              <BusyCoin className="size-5 text-primary" />
            )}
          </div>
        )}

        {/* ── In progress ───────────────────────────────────── */}
        {(pending || advance) && (
          <div className="flex flex-col gap-3">
            {pending &&
              (() => {
                const ready = now >= pending.releaseAt;
                const total = pending.releaseAt - pending.requestedAt;
                return (
                  <InProgressCard
                    href="/app/withdraw"
                    Icon={CooldownIcon}
                    label="Withdrawal"
                    amount={pending.amountUsdc}
                    status={ready ? "Ready" : humanDuration(pending.releaseAt - now)}
                    sub={ready ? "Tap to send it" : "left to wait"}
                    tone={ready ? "primary" : "warning"}
                    progress={total > 0 ? (now - pending.requestedAt) / total : 1}
                  />
                );
              })()}
            {advance &&
              (() => {
                // One fee tier: 30 days on mainnet, minutes on the testnet deployment.
                const tier = (vault?.feePeriodSeconds ?? 30 * 86_400) * 1000;
                const age = now - advance.takenAt;
                const [status, sub] =
                  age <= tier
                    ? ["Free", `for ${humanDuration(tier - age)}`]
                    : age <= 2 * tier
                      ? ["1.5% fee", `3% in ${humanDuration(2 * tier - age)}`]
                      : age <= 3 * tier
                        ? ["3% fee", `settles in ${humanDuration(3 * tier - age)}`]
                        : ["Due", "settles from savings"];
                return (
                  <InProgressCard
                    href="/app/advance"
                    Icon={AdvanceIcon}
                    label="Advance · repaid from your next payment"
                    amount={advance.amountUsdc}
                    status={status}
                    sub={sub}
                    tone={age <= tier ? "primary" : "warning"}
                    progress={age / (3 * tier)}
                  />
                );
              })()}
          </div>
        )}

        {/* ── Split ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <SplitTile label="To spend" value={spendable} pct={spendPct} tone="spend" />
          <SplitTile label="Kept" value={kept} pct={keepPct} tone="keep" />
        </div>

        {/* ── Activity ──────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[18px] font-extrabold tracking-[-0.02em]">Activity</h2>
            {!vault && (
              <Button variant="secondary" size="sm" onClick={simulatePayment}>
                <Plus className="size-4" />
                Test payment
              </Button>
            )}
          </div>

          {vault ? (
            activity === null ? (
              <Skeleton className="h-[180px]" />
            ) : activity.length === 0 ? (
              <Card className="flex flex-col items-center gap-3 px-6 py-9 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <QrIcon className="size-6" />
                </span>
                <div>
                  <p className="text-[15px] font-semibold">No payments yet</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    Share your Get paid address with a client. Each payment splits the moment it lands.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setGetPaidOpen(true)} className="mt-1">
                  Show my QR
                </Button>
              </Card>
            ) : (
              <ActivityList items={activity.slice(0, 20)} now={now} />
            )
          ) : payments.length === 0 ? (
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

      <GetPaidSheet open={getPaidOpen} onOpenChange={setGetPaidOpen} address={isVaultConfigured() ? payTo : address} />
      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} address={address} />

      <Sheet
        open={alertsOpen}
        onOpenChange={(open) => {
          setAlertsOpen(open);
          if (!open) markSeen();
        }}
      >
        <SheetContent title="Notifications">
          {vault ? (
            <div className="flex flex-col gap-4">
              {permission === "denied" && (
                <p className="rounded-2xl bg-warning/10 px-4 py-3 text-[12.5px] leading-relaxed text-warning ring-1 ring-warning/25">
                  Phone notifications are off. To turn them on: Settings → Notifications → Keep Yours → Allow Notifications.
                </p>
              )}
              {permission === "default" && (
                <Button variant="secondary" onClick={ask} className="w-full">
                  <Bell /> Tell me when money arrives
                </Button>
              )}
              {activity && activity.length > 0 ? (
                <ActivityList items={activity.slice(0, 15)} now={now} unreadAfter={seenAt} />
              ) : (
                <p className="py-6 text-center text-[13px] text-muted-foreground">
                  Nothing yet. Payments, advances and withdrawals show up here.
                </p>
              )}
            </div>
          ) : alerts.length === 0 ? (
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
