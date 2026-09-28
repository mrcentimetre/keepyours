"use client";

import { useEffect, useState } from "react";
import { getVaultSettings, type VaultSettings } from "@/lib/vault-settings";

function Logo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-128.png" alt="" width={40} height={40} className="block" />
  );
}

function formatCooldown(seconds: number): string {
  const hours = seconds / 3600;
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

/** Placeholder for what T3.2 builds. Shows the mock settings T3.1 saved, so
 * the setup -> home chain is visibly real, not just a redirect to nothing. */
export default function HomePlaceholder() {
  const [settings, setSettings] = useState<VaultSettings | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSettings(getVaultSettings());
  }, []);

  if (!mounted) return null;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-8 text-center">
      <Logo />
      <p className="font-display text-2xl font-bold">Setup saved</p>
      {settings && (
        <p className="font-mono text-sm text-[#62E6A0]">
          Keep {Math.round(settings.keepBps / 100)}% · {formatCooldown(settings.cooldownSeconds)}{" "}
          cooldown
        </p>
      )}
      <p className="max-w-[42ch] text-sm text-[#8CA497]">
        The real home screen (balance, activity, get-paid link) lands in T3.2.
        This is a placeholder.
      </p>
    </main>
  );
}
