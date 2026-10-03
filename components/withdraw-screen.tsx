"use client";

import { reportError, track } from "@/lib/analytics";
import { useEffect, useLayoutEffect, useState } from "react";
import { isHydrated } from "@/lib/hydrated";
import type { Address } from "viem";
import { ArrowDown, Lock, Timer } from "lucide-react";
import { BusyCoin } from "./app/busy-coin";
import { toast } from "sonner";
import { getCachedAddress } from "@/hooks/use-passkey-wallet";
import { useVault } from "@/hooks/use-vault";
import {
  cancelWithdrawCall,
  executeWithdrawCall,
  plainTxError,
  requestWithdrawCall,
  sendWithPasskey, isVaultConfigured } from "@/lib/vault";
import { getKeptBalance } from "@/lib/mock-activity";
import { getVaultSettings, DEFAULT_SETTINGS } from "@/lib/vault-settings";
import {
  getPendingWithdrawal,
  requestWithdrawal,
  cancelWithdrawal,
  executeWithdrawal,
  type PendingWithdrawal,
} from "@/lib/mock-withdrawal";
import { formatUsdc, formatCooldown, formatCooldownAdj, formatCountdown, formatDateTime, shorten } from "@/lib/format";
import AmountKeypad, { AmountDisplay, AmountPresets, type AmountPreset } from "./amount-keypad";
import { Screen, ScreenHeader, Money, WalletAvatar, SectionLabel } from "./app/screen";
import CountdownRing from "./countdown-ring";
import SlideToConfirm from "./slide-to-confirm";
import { Card, CardRows } from "./ui/card";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Sheet, SheetContent } from "./ui/sheet";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 text-[14px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

function WithdrawSkeleton() {
  return (
    <Screen>
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-[132px]" />
      <Skeleton className="mx-auto h-14 w-44" />
      <Skeleton className="h-[270px]" />
    </Screen>
  );
}

export default function WithdrawScreen() {
  // Arriving by navigation (not a cold open): render real content on the first
  // frame, so the screen transition slides content, not an empty page.
  const [returning] = useState(isHydrated);
  const [mounted, setMounted] = useState(returning);
  const [balance, setBalance] = useState(0);
  const [address, setAddress] = useState<string | null>(() => (returning ? getCachedAddress() : null));
  const [cooldownSeconds, setCooldownSeconds] = useState(DEFAULT_SETTINGS.cooldownSeconds);
  const [pending, setPending] = useState<PendingWithdrawal | null>(null);
  const [amount, setAmount] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [slideKey, setSlideKey] = useState(0);
  const { state: vault, refresh: refreshVault } = useVault(address);

  // Real vault: what can leave now is savings minus what an open advance reserves.
  useLayoutEffect(() => {
    if (!vault) return;
    setBalance(vault.withdrawable);
    setCooldownSeconds(vault.cooldownSeconds);
    setPending(vault.pending && { amountUsdc: vault.pending.amount, requestedAt: vault.pending.requestedAt, releaseAt: vault.pending.releaseAt });
  }, [vault]);

  /** One vault transaction behind Face ID. Returns true if it went through. */
  async function run(build: (vault: Address) => { to: Address; data: `0x${string}` }): Promise<boolean> {
    if (!vault) return false;
    setBusy(true);
    try {
      await sendWithPasskey(address as Address, build(vault.address));
      await refreshVault();
      return true;
    } catch (e) {
      toast.error(plainTxError(e));
      track("tx_failed", { action: "withdraw", reason: plainTxError(e) });
      reportError(e, "withdraw");
      setSlideKey((k) => k + 1); // let them slide again
      return false;
    } finally {
      setBusy(false);
    }
  }

  function refresh() {
    setBalance(getKeptBalance());
    setPending(getPendingWithdrawal());
    setNow(Date.now());
  }

  useEffect(() => {
    setMounted(true);
    setAddress(getCachedAddress());
    setCooldownSeconds((getVaultSettings() ?? DEFAULT_SETTINGS).cooldownSeconds);
    // The mock layer only stands in when no contracts are configured; loading
    // it next to a real vault made the numbers blink.
    if (isVaultConfigured()) setNow(Date.now());
    else refresh();
  }, []);

  // Live countdown — ticks every second while a withdrawal is pending.
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pending]);

  if (!mounted) return <WithdrawSkeleton />;

  const value = Number(amount);
  const overBalance = value > balance;
  const amountValid = Number.isFinite(value) && value > 0 && !overBalance;

  const presets: AmountPreset[] =
    balance > 0
      ? [
          { label: "25%", value: round2(balance * 0.25) },
          { label: "50%", value: round2(balance * 0.5) },
          { label: "75%", value: round2(balance * 0.75) },
          { label: "Max", value: round2(balance) },
        ]
      : [];

  async function start() {
    if (!amountValid) return;
    if (vault) {
      if (await run((v) => requestWithdrawCall(v, amount))) {
        setAmount("");
        setReviewOpen(false);
        toast.success("Waiting period started");
        track("withdraw_requested");
      }
      return;
    }
    requestWithdrawal(value);
    // Let the slide's check mark land before the sheet drops away — and only
    // clear the amount then, or the sheet flashes "$0.00" on its way out.
    setTimeout(() => {
      setAmount("");
      setReviewOpen(false);
      refresh();
      toast.success("Waiting period started");
    }, 350);
  }

  async function cancel() {
    if (vault) {
      if (await run(cancelWithdrawCall)) {
        toast.success("Withdrawal cancelled. Your savings stay put.");
        track("withdraw_cancelled");
      }
      return;
    }
    cancelWithdrawal();
    refresh();
    toast.success("Withdrawal cancelled. Your savings stay put.");
  }

  async function send() {
    const amt = pending?.amountUsdc ?? 0;
    if (vault) {
      if (await run(executeWithdrawCall)) {
        toast.success(`Sent $${formatUsdc(amt)} to your wallet`);
        track("withdraw_completed");
      }
      return;
    }
    executeWithdrawal();
    refresh();
    toast.success(`Sent $${formatUsdc(amt)} to your wallet`);
  }

  // ── Waiting ─────────────────────────────────────────────────
  if (pending) {
    const total = pending.releaseAt - pending.requestedAt;
    const released = now >= pending.releaseAt;
    const progress = total > 0 ? (now - pending.requestedAt) / total : 1;

    return (
      <Screen>
        <ScreenHeader title="Withdraw" subtitle={released ? "Ready to send" : "Waiting period in progress"} />

        <Card className="flex flex-col items-center px-5 py-7">
          <CountdownRing progress={progress} color={released ? "var(--primary)" : "var(--warning)"}>
            <SectionLabel>{released ? "Ready" : "Releases in"}</SectionLabel>
            <p
              className={
                "mt-1 font-mono font-semibold tracking-[-0.03em] tabular-nums " +
                (pending.releaseAt - now >= 86_400_000 ? "text-[25px] " : "text-[30px] ") +
                (released ? "text-primary" : "text-warning")
              }
            >
              {released ? "00:00:00" : formatCountdown(pending.releaseAt - now)}
            </p>
            <Money value={pending.amountUsdc} className="mt-1 text-[15px] text-muted-foreground" />
          </CountdownRing>
          <p className="mt-6 max-w-[34ch] text-center text-[13px] leading-relaxed text-muted-foreground">
            {released
              ? "The waiting period is over. Send it whenever you're ready."
              : "If this wasn't you, cancel. Nothing leaves until the timer ends."}
          </p>
        </Card>

        <Card>
          <CardRows>
            <Row label="Amount">
              <Money value={pending.amountUsdc} />
            </Row>
            <Row label="To">
              <span className="font-mono">{address ? shorten(address) : "Your wallet"}</span>
            </Row>
            <Row label="Requested">{formatDateTime(pending.requestedAt)}</Row>
            <Row label="Releases">{formatDateTime(pending.releaseAt)}</Row>
          </CardRows>
        </Card>

        {released ? (
          <Button onClick={send} disabled={busy} className="w-full">
            {busy && <BusyCoin />}
            Send to my wallet
          </Button>
        ) : (
          <Button onClick={cancel} disabled={busy} variant="destructive" className="w-full">
            {busy && <BusyCoin />}
            Cancel withdrawal
          </Button>
        )}
      </Screen>
    );
  }

  // ── Entry ───────────────────────────────────────────────────
  return (
    <Screen className="gap-5">
      <ScreenHeader title="Withdraw" subtitle="From savings, after a waiting period" />

      <Card className="relative">
        <CardRows>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Lock className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-muted-foreground">From</p>
              <p className="text-[14px] font-semibold">Savings</p>
            </div>
            <div className="text-right">
              <Money value={balance} className="text-[14px] font-semibold" />
              <p className="text-[11.5px] text-muted-foreground">available</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <WalletAvatar address={address} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-muted-foreground">To</p>
              <p className="text-[14px] font-semibold">Your wallet</p>
            </div>
            <p className="font-mono text-[13px] text-muted-foreground">{address ? shorten(address) : "—"}</p>
          </div>
        </CardRows>
        <span className="absolute top-1/2 left-[24px] flex size-6 -translate-y-1/2 items-center justify-center rounded-full bg-card text-muted-foreground ring-1 ring-hairline">
          <ArrowDown className="size-3.5" />
        </span>
      </Card>

      <div className="flex flex-col items-center gap-1 py-1">
        <AmountDisplay value={amount} invalid={overBalance} />
        <p className={"flex items-center gap-1.5 text-[12.5px] " + (overBalance ? "text-destructive" : "text-muted-foreground")}>
          {overBalance ? (
            <>More than your savings (${formatUsdc(balance)})</>
          ) : (
            <>
              <Timer className="size-3.5" />
              Leaves after a {formatCooldownAdj(cooldownSeconds)} waiting period
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
        confirmLabel="Review withdrawal"
      />

      <Sheet open={reviewOpen} onOpenChange={setReviewOpen}>
        <SheetContent title="Review withdrawal">
          <div className="flex flex-col gap-5">
            <Money value={value || 0} className="block text-center text-[40px] font-semibold" centsClassName="text-[26px]" />
            <Card className="bg-surface-2/50">
              <CardRows>
                <Row label="From">Savings</Row>
                <Row label="To">
                  <span className="font-mono">{address ? shorten(address) : "Your wallet"}</span>
                </Row>
                <Row label="Waiting period">{formatCooldown(cooldownSeconds)}</Row>
                <Row label="Releases about">{formatDateTime(now + cooldownSeconds * 1000)}</Row>
                <Row label="Cancel fee">
                  <span className="text-primary">None</span>
                </Row>
              </CardRows>
            </Card>
            <p className="rounded-2xl bg-warning/10 px-4 py-3 text-[12.5px] leading-relaxed text-warning ring-1 ring-warning/25">
              Your money waits here first. You can cancel any time before it releases.
            </p>
            {busy ? (
              <Button size="lg" disabled className="w-full">
                <BusyCoin />
                Starting…
              </Button>
            ) : (
              <SlideToConfirm key={slideKey} label="Slide to start" onConfirm={start} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </Screen>
  );
}
