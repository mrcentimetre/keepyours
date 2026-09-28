"use client";

import { useEffect, useState } from "react";
import { getCachedAddress } from "@/hooks/use-passkey-wallet";
import { getVaultSettings, DEFAULT_SETTINGS, type VaultSettings } from "@/lib/vault-settings";
import { CopyIcon } from "./icons";

function shorten(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatCooldown(seconds: number): string {
  const hours = seconds / 3600;
  if (hours < 24) return `${hours} hours`;
  return `${Math.round(hours / 24)} days`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[#1E3428] py-3.5 last:border-b-0">
      <span className="text-[13px] text-[#8CA497]">{label}</span>
      <span className="text-[14px] text-[#EAF5EF]">{value}</span>
    </div>
  );
}

export default function SettingsScreen() {
  const [mounted, setMounted] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [settings, setSettings] = useState<VaultSettings>(DEFAULT_SETTINGS);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAddress(getCachedAddress());
    setSettings(getVaultSettings() ?? DEFAULT_SETTINGS);
  }, []);

  if (!mounted) return null;

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

  return (
    <main className="flex min-h-dvh flex-col gap-8 p-6 pb-10">
      <h1 className="font-display text-[22px] font-bold">Settings</h1>

      <section className="flex flex-col gap-1">
        <h2 className="mb-2 text-[13px] text-[#8CA497]">Wallet</h2>
        <div className="rounded-[18px] border border-[#1E3428] bg-[#12211A] px-4">
          <div className="flex items-center justify-between border-b border-[#1E3428] py-3.5">
            <span className="text-[13px] text-[#8CA497]">Address</span>
            <button
              type="button"
              onClick={copyAddress}
              disabled={!address}
              className="flex items-center gap-1.5 font-mono text-[13px] text-[#EAF5EF] disabled:opacity-50"
            >
              {address ? (copied ? "Copied" : shorten(address)) : "Not connected"}
              {address && <CopyIcon />}
            </button>
          </div>
          <Row label="Signed in with" value="Passkey on this device" />
        </div>
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="mb-2 text-[13px] text-[#8CA497]">Vault</h2>
        <div className="rounded-[18px] border border-[#1E3428] bg-[#12211A] px-4">
          <Row label="Keep" value={`${Math.round(settings.keepBps / 100)}%`} />
          <Row label="Spend" value={`${100 - Math.round(settings.keepBps / 100)}%`} />
          <Row label="Waiting period" value={formatCooldown(settings.cooldownSeconds)} />
        </div>
        <p className="mt-2 text-[12px] text-[#8CA497]">
          Changing these after setup isn&rsquo;t built yet — coming in a future update.
        </p>
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="mb-2 text-[13px] text-[#8CA497]">About</h2>
        <div className="rounded-[18px] border border-[#1E3428] bg-[#12211A] px-4">
          <Row label="Network" value="Arbitrum Sepolia (testnet)" />
          <Row label="Status" value="Unaudited" />
        </div>
      </section>
    </main>
  );
}
