"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCachedAddress } from "@/hooks/use-passkey-wallet";
import { getVaultSettings, DEFAULT_SETTINGS, type VaultSettings } from "@/lib/vault-settings";
import { getPayments, getKeptBalance, addSimulatedPayment, type Payment } from "@/lib/mock-activity";
import QrCode from "./qr-code";

function Logo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-128.png" alt="" width={32} height={32} className="block" />
  );
}

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

export default function HomeScreen() {
  const [mounted, setMounted] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [settings, setSettings] = useState<VaultSettings>(DEFAULT_SETTINGS);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [copied, setCopied] = useState(false);

  function refresh() {
    setPayments(getPayments());
  }

  useEffect(() => {
    setMounted(true);
    setAddress(getCachedAddress());
    setSettings(getVaultSettings() ?? DEFAULT_SETTINGS);
    refresh();
  }, []);

  if (!mounted) return null;

  const keepPct = Math.round(settings.keepBps / 100);
  const spendPct = 100 - keepPct;
  const kept = getKeptBalance();

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard can be blocked (permissions, non-HTTPS); no harm done
    }
  }

  function simulatePayment() {
    addSimulatedPayment(100, settings.keepBps);
    refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col gap-8 p-6 pb-10">
      <header className="flex items-center gap-2">
        <Logo />
        <span className="font-display text-[15px] font-bold">Keep Yours</span>
      </header>

      <section className="flex flex-col items-center gap-3 text-center">
        <p className="text-[13px] text-[#8CA497]">Total kept</p>
        <p className="font-mono text-[44px] font-semibold text-[#EAF5EF]">${formatUsdc(kept)}</p>

        <div className="mt-1 flex w-full max-w-[320px] h-2.5 gap-1 overflow-hidden rounded-full">
          <div className="bg-[#62E6A0]" style={{ width: `${spendPct}%` }} />
          <div className="bg-[#16B862]" style={{ width: `${keepPct}%` }} />
        </div>
        <div className="flex w-full max-w-[320px] justify-between text-[12px]">
          <span className="text-[#62E6A0]">Spend {spendPct}%</span>
          <span className="text-[#16B862]">Keep {keepPct}%</span>
        </div>
      </section>

      <section className="flex flex-col items-center gap-3 rounded-[24px] border border-[#1E3428] bg-[#12211A] p-6 text-center">
        <h3 className="font-display text-[15px] font-bold">Get paid</h3>
        {address ? (
          <>
            <QrCode value={address} size={140} />
            <button
              type="button"
              onClick={copyAddress}
              className="font-mono text-[13px] text-[#8CA497] underline decoration-[#2C4A3B] underline-offset-4 hover:text-[#BFD8C9]"
            >
              {copied ? "Copied" : shorten(address)}
            </button>
          </>
        ) : (
          <p className="text-[13px] text-[#8CA497]">No wallet address yet.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-[15px] font-bold">Activity</h3>
          <button
            type="button"
            onClick={simulatePayment}
            className="text-[12px] text-[#8CA497] underline decoration-[#2C4A3B] underline-offset-4 hover:text-[#BFD8C9]"
          >
            Simulate a $100 test payment
          </button>
        </div>

        {payments.length === 0 ? (
          <p className="rounded-[18px] border border-[#1E3428] p-4 text-center text-[13px] text-[#8CA497]">
            No payments yet. Share your get-paid link above.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-[18px] border border-[#1E3428] bg-[#12211A] p-4"
              >
                <div>
                  <p className="font-mono text-[15px] text-[#62E6A0]">+${formatUsdc(p.totalUsdc)}</p>
                  <p className="text-[12px] text-[#8CA497]">
                    ${formatUsdc(p.keptUsdc)} kept · ${formatUsdc(p.spentUsdc)} to spend
                  </p>
                </div>
                <span className="text-[12px] text-[#8CA497]">{timeAgo(p.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <nav className="mt-auto grid grid-cols-2 gap-3">
        <Link
          href="/app/withdraw"
          className="rounded-full border border-[#1E3428] py-3 text-center text-[14px] font-semibold text-[#EAF5EF] hover:border-[#2C4A3B]"
        >
          Withdraw
        </Link>
        <Link
          href="/app/advance"
          className="rounded-full border border-[#1E3428] py-3 text-center text-[14px] font-semibold text-[#EAF5EF] hover:border-[#2C4A3B]"
        >
          Advance
        </Link>
      </nav>
    </main>
  );
}
