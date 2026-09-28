"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getCachedAddress } from "@/hooks/use-passkey-wallet";
import { getVaultSettings, DEFAULT_SETTINGS, type VaultSettings } from "@/lib/vault-settings";
import { getPayments, getKeptBalance, addSimulatedPayment, type Payment } from "@/lib/mock-activity";
import { SearchIcon, BellIcon, ReceiveIcon, WithdrawIcon, AdvanceIcon, CopyIcon } from "./icons";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import QrCode from "./qr-code";

function shorten(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatUsdc(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeAgo(at: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function ActionButton({
  href,
  onClick,
  icon,
  label,
}: {
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  const content = (
    <>
      <div className="flex size-12 items-center justify-center rounded-full border border-border bg-card transition-colors group-hover:border-secondary group-active:scale-95">
        {icon}
      </div>
      <span className="text-[12px] text-muted-foreground">{label}</span>
    </>
  );
  const className = "group flex flex-col items-center gap-1.5 transition-transform";
  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function HomeSkeleton() {
  return (
    <main className="flex min-h-dvh flex-col gap-8 p-6 pb-10">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <div className="flex gap-2">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="size-9 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-11 w-40" />
        <Skeleton className="h-2.5 w-full max-w-[320px] rounded-full" />
      </div>
      <div className="flex justify-around">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="size-12 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </main>
  );
}

export default function HomeScreen() {
  const [mounted, setMounted] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [settings, setSettings] = useState<VaultSettings>(DEFAULT_SETTINGS);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [copied, setCopied] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);

  function refresh() {
    setPayments(getPayments());
  }

  useEffect(() => {
    setMounted(true);
    setAddress(getCachedAddress());
    setSettings(getVaultSettings() ?? DEFAULT_SETTINGS);
    refresh();
  }, []);

  if (!mounted) return <HomeSkeleton />;

  const keepPct = Math.round(settings.keepBps / 100);
  const spendPct = 100 - keepPct;
  const kept = getKeptBalance();

  const filteredPayments = query.trim()
    ? payments.filter((p) =>
        `${formatUsdc(p.totalUsdc)} ${formatUsdc(p.keptUsdc)} ${formatUsdc(p.spentUsdc)}`.includes(
          query.trim()
        )
      )
    : payments;

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — copy it manually instead");
    }
  }

  function simulatePayment() {
    addSimulatedPayment(100, settings.keepBps);
    refresh();
    toast.success("Simulated a $100 test payment");
  }

  function scrollToGetPaid() {
    qrRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <main className="flex min-h-dvh flex-col gap-8 p-6 pb-10 duration-500 animate-in fade-in slide-in-from-bottom-2">
      <header className="flex items-center justify-between">
        <span className="font-display text-[15px] font-bold">Keep Yours</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search activity"
            className="h-9 w-9 rounded-full border-border bg-card"
          >
            <SearchIcon />
          </Button>
          <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-full border-border bg-card">
            <Link href="/app/settings" aria-label="Notifications">
              <BellIcon />
            </Link>
          </Button>
        </div>
      </header>

      <section className="flex flex-col items-center gap-3 text-center">
        <p className="text-[13px] text-muted-foreground">Total kept</p>
        <p className="font-mono text-[44px] font-semibold text-foreground">${formatUsdc(kept)}</p>

        <div className="mt-1 flex w-full max-w-[320px] h-2.5 gap-1 overflow-hidden rounded-full bg-secondary/40">
          <div className="bg-accent transition-all" style={{ width: `${spendPct}%` }} />
          <div className="bg-primary transition-all" style={{ width: `${keepPct}%` }} />
        </div>
        <div className="flex w-full max-w-[320px] justify-between text-[12px]">
          <span className="text-accent">Spend {spendPct}%</span>
          <span className="text-primary">Keep {keepPct}%</span>
        </div>
      </section>

      <section className="flex items-start justify-around">
        <ActionButton onClick={scrollToGetPaid} icon={<ReceiveIcon />} label="Get paid" />
        <ActionButton href="/app/withdraw" icon={<WithdrawIcon />} label="Withdraw" />
        <ActionButton href="/app/advance" icon={<AdvanceIcon />} label="Advance" />
        <ActionButton onClick={copyAddress} icon={<CopyIcon />} label={copied ? "Copied" : "Copy"} />
      </section>

      <Card ref={qrRef} className="flex flex-col items-center gap-3 p-6 text-center">
        <h3 className="font-display text-[15px] font-bold">Get paid</h3>
        {address ? (
          <>
            <QrCode value={address} size={140} />
            <button
              type="button"
              onClick={copyAddress}
              className="font-mono text-[13px] text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground"
            >
              {copied ? "Copied" : shorten(address)}
            </button>
          </>
        ) : (
          <p className="text-[13px] text-muted-foreground">No wallet address yet.</p>
        )}
      </Card>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-[15px] font-bold">Activity</h3>
          <button
            type="button"
            onClick={simulatePayment}
            className="text-[12px] text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground"
          >
            Simulate a $100 test payment
          </button>
        </div>

        {searchOpen && (
          <Input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by amount…"
            className="animate-in fade-in slide-in-from-top-1"
          />
        )}

        {filteredPayments.length === 0 ? (
          <Card className="p-4 text-center text-[13px] text-muted-foreground">
            {payments.length === 0
              ? "No payments yet. Share your get-paid link above."
              : "No activity matches that search."}
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredPayments.map((p) => (
              <Card key={p.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-mono text-[15px] text-primary">+${formatUsdc(p.totalUsdc)}</p>
                  <p className="text-[12px] text-muted-foreground">
                    ${formatUsdc(p.keptUsdc)} kept · ${formatUsdc(p.spentUsdc)} to spend
                  </p>
                </div>
                <span className="text-[12px] text-muted-foreground">{timeAgo(p.at)}</span>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
