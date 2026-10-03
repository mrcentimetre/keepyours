"use client";

import { reportError, track } from "@/lib/analytics";
import { useEffect, useState } from "react";
import Link from "next/link";
import { isAddress, isAddressEqual, type Address, type Hex } from "viem";
import { ChevronLeft, CircleCheck, ClipboardPaste, ExternalLink, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { getCachedAddress } from "@/hooks/use-passkey-wallet";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { loginPasskeyWallet } from "@/lib/zerodev";
import { USDC_ADDRESS, explorerTx, usdcTransferData } from "@/lib/usdc";
import { plainTxError } from "@/lib/vault";
import { formatUsdc, shorten } from "@/lib/format";
import AmountKeypad, { AmountDisplay, AmountPresets, type AmountPreset } from "./amount-keypad";
import { Screen, ScreenHeader, Money } from "./app/screen";
import { FlowScreen, IconOrb, FlowTitle, FlowBody } from "./app/flow";
import SlideToConfirm from "./slide-to-confirm";
import { Card, CardRows } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Sheet, SheetContent } from "./ui/sheet";

function round2(n: number): number {
  return Math.floor(n * 100) / 100;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5 text-[14px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export default function SendScreen() {
  const [mounted, setMounted] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ hash: Hex; amount: number; to: string } | null>(null);
  const { balance, refresh } = useUsdcBalance(address);

  useEffect(() => {
    setMounted(true);
    setAddress(getCachedAddress());
  }, []);

  if (!mounted) return null;

  const available = balance ?? 0;
  const value = Number(amount);
  const overBalance = value > available;
  const toTrimmed = to.trim();
  const toValid = isAddress(toTrimmed);
  const toSelf = toValid && address !== null && isAddressEqual(toTrimmed, address as Address);
  const amountValid = Number.isFinite(value) && value > 0 && !overBalance;
  const canReview = toValid && !toSelf && amountValid && Boolean(USDC_ADDRESS);

  const presets: AmountPreset[] =
    available > 0
      ? [
          { label: "25%", value: round2(available * 0.25) },
          { label: "50%", value: round2(available * 0.5) },
          { label: "Max", value: round2(available) },
        ]
      : [];

  async function paste() {
    try {
      setTo((await navigator.clipboard.readText()).trim());
    } catch {
      toast.error("Couldn't read the clipboard. Long-press the field to paste.");
    }
  }

  async function send() {
    if (!canReview || !USDC_ADDRESS) return;
    setSending(true);
    setError(null);
    try {
      // Face ID prompt. A live signer is only ever held for this one send.
      const wallet = await loginPasskeyWallet("Keep Yours");
      if (address && !isAddressEqual(wallet.address, address as Address)) {
        throw new Error("That passkey opens a different wallet than the one on this phone.");
      }
      const hash = await wallet.kernelClient.sendTransaction({
        account: wallet.kernelClient.account!,
        chain: wallet.kernelClient.chain,
        to: USDC_ADDRESS,
        data: usdcTransferData(toTrimmed as Address, amount),
        value: BigInt(0),
      });
      setSent({ hash, amount: value, to: toTrimmed });
      track("send_completed");
      setReviewOpen(false);
      setAmount("");
      setTo("");
      refresh();
    } catch (e) {
      const msg = e instanceof Error && /different wallet/.test(e.message) ? e.message : plainTxError(e);
      setError(msg);
      track("tx_failed", { action: "send", reason: msg.startsWith("That passkey") ? "different_wallet" : msg });
      reportError(e, "send");
    } finally {
      setSending(false);
    }
  }

  // ── Sent ────────────────────────────────────────────────────
  if (sent) {
    return (
      <FlowScreen>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <IconOrb>
            <CircleCheck className="size-12" strokeWidth={1.75} />
          </IconOrb>
          <FlowTitle>Sent ${formatUsdc(sent.amount)}</FlowTitle>
          <FlowBody className="max-w-[32ch]">
            To <span className="font-mono">{shorten(sent.to)}</span>. It&apos;s on the network now.
          </FlowBody>
          <a
            href={explorerTx(sent.hash)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary"
          >
            View on Arbiscan <ExternalLink className="size-4" />
          </a>
        </div>
        <div className="flex flex-col gap-3">
          <Button size="lg" asChild className="w-full">
            <Link href="/app/home" transitionTypes={["nav-back"]}>
              Done
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSent(null)} className="self-center">
            Send more
          </Button>
        </div>
      </FlowScreen>
    );
  }

  // ── Entry ───────────────────────────────────────────────────
  return (
    <Screen className="gap-5 pb-[calc(env(safe-area-inset-bottom)+16px)]">
      <Link
        href="/app/home"
        transitionTypes={["nav-back"]}
        className="-mb-2 -ml-1 inline-flex w-fit items-center gap-0.5 text-[15px] font-semibold text-muted-foreground active:text-foreground"
      >
        <ChevronLeft className="size-5" /> Home
      </Link>
      <ScreenHeader title="Send" subtitle="From your wallet, to any address" />

      <Card>
        <CardRows>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="flex size-10 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Wallet className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-muted-foreground">From</p>
              <p className="text-[14px] font-semibold">Your wallet</p>
            </div>
            <div className="text-right">
              {balance === null ? (
                <Loader2 className="ml-auto size-4 animate-spin text-muted-foreground" />
              ) : (
                <Money value={available} className="text-[14px] font-semibold" />
              )}
              <p className="text-[11.5px] text-muted-foreground">available</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 px-4 py-3.5">
            <label htmlFor="send-to" className="text-[12px] text-muted-foreground">
              To
            </label>
            <div className="flex gap-2">
              <Input
                id="send-to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="0x… exchange or wallet address"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="font-mono text-[13px]"
                aria-invalid={to.length > 0 && (!toValid || toSelf)}
              />
              <Button variant="secondary" size="icon" onClick={paste} aria-label="Paste address">
                <ClipboardPaste />
              </Button>
            </div>
            {to.length > 0 && !toValid && (
              <p className="text-[12px] text-destructive">That isn&apos;t a valid address.</p>
            )}
            {toSelf && <p className="text-[12px] text-destructive">That&apos;s this wallet.</p>}
            {toValid && !toSelf && (
              <p className="text-[12px] text-muted-foreground">
                Check it matches. Sends on Arbitrum can&apos;t be reversed.
              </p>
            )}
          </div>
        </CardRows>
      </Card>

      <div className="flex flex-col items-center gap-1 py-1">
        <AmountDisplay value={amount} invalid={overBalance} />
        <p className={"text-[12.5px] " + (overBalance ? "text-destructive" : "text-muted-foreground")}>
          {overBalance ? <>More than your wallet (${formatUsdc(available)})</> : <>USDC on Arbitrum · no fee to pay</>}
        </p>
      </div>

      <AmountPresets presets={presets} value={amount} onPick={setAmount} />

      <AmountKeypad
        value={amount}
        onChange={setAmount}
        onConfirm={() => canReview && setReviewOpen(true)}
        confirmDisabled={!canReview}
        confirmLabel="Review send"
      />

      <Sheet
        open={reviewOpen}
        onOpenChange={(open) => {
          if (sending) return;
          setReviewOpen(open);
          setError(null);
        }}
      >
        <SheetContent title="Review send">
          <div className="flex flex-col gap-5">
            <Money value={value || 0} className="block text-center text-[40px] font-semibold" centsClassName="text-[26px]" />
            <Card className="bg-surface-2/50">
              <CardRows>
                <Row label="From">Your wallet</Row>
                <Row label="To">
                  <span className="font-mono">{toValid ? shorten(toTrimmed) : "—"}</span>
                </Row>
                <Row label="Network">Arbitrum</Row>
                <Row label="Network fee">
                  <span className="text-primary">Covered</span>
                </Row>
              </CardRows>
            </Card>
            {error && (
              <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-[13px] leading-relaxed text-destructive ring-1 ring-destructive/25">
                {error}
              </p>
            )}
            {sending ? (
              <Button size="lg" disabled className="w-full">
                <Loader2 className="animate-spin" />
                Sending…
              </Button>
            ) : (
              <SlideToConfirm key={error ?? "slide"} label="Slide to send" onConfirm={send} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </Screen>
  );
}
