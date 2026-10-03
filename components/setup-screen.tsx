"use client";

import { reportError, track } from "@/lib/analytics";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Address } from "viem";
import { CircleCheck, Loader2 } from "lucide-react";
import {
  DEFAULT_SETTINGS,
  COOLDOWN_PRESETS,
  DEMO_COOLDOWN_SECONDS,
  saveVaultSettings,
  type VaultSettings,
} from "@/lib/vault-settings";
import { cn } from "@/lib/utils";
import { getCachedAddress } from "@/hooks/use-passkey-wallet";
import { createVaultCall, isVaultConfigured, plainTxError, sendWithPasskey, vaultOf } from "@/lib/vault";
import { FlowScreen, FlowTitle, FlowBody, BrandMark } from "./app/flow";
import { SectionLabel } from "./app/screen";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

const EXAMPLE = 100; // a worked example, not anyone's balance

export default function SetupScreen() {
  const router = useRouter();
  const [keepBps, setKeepBps] = useState(DEFAULT_SETTINGS.keepBps);
  const [cooldownSeconds, setCooldownSeconds] = useState(DEFAULT_SETTINGS.cooldownSeconds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const keepPct = Math.round(keepBps / 100);
  const spendPct = 100 - keepPct;

  async function confirm() {
    const settings: VaultSettings = { keepBps, cooldownSeconds };
    const owner = getCachedAddress();
    if (!owner || !isVaultConfigured()) {
      // No contracts configured (local dev without .env): keep the old mock flow.
      saveVaultSettings(settings);
      router.push("/app/home");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Signed in with an existing passkey on a new phone: the vault is already there.
      if (!(await vaultOf(owner))) {
        await sendWithPasskey(owner, createVaultCall(owner, keepBps, cooldownSeconds));
        track("vault_created", { demo_waiting_period: cooldownSeconds < 3600 });
      }
      saveVaultSettings(settings);
      router.push("/app/home");
    } catch (e) {
      setError(plainTxError(e));
      track("tx_failed", { action: "create_vault", reason: plainTxError(e) });
      reportError(e, "create_vault");
      setBusy(false);
    }
  }

  return (
    <FlowScreen>
      <BrandMark />

      <div className="flex flex-1 flex-col gap-7 py-8">
        <div className="flex flex-col gap-3">
          <FlowTitle>Set up your vault</FlowTitle>
          <FlowBody>Two choices. Both show in Settings afterwards.</FlowBody>
        </div>

        <Card className="p-5">
          <SectionLabel>Split every payment</SectionLabel>
          <p className="mt-1 text-[13px] text-muted-foreground">A ${EXAMPLE} payment would become:</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-accent/10 p-3.5 ring-1 ring-accent/20">
              <p className="text-[11px] font-bold tracking-[0.1em] text-accent uppercase">Spend · {spendPct}%</p>
              <p className="mt-1 font-mono text-[24px] font-semibold tracking-[-0.03em] tabular-nums">
                ${((EXAMPLE * spendPct) / 100).toFixed(0)}
              </p>
            </div>
            <div className="rounded-2xl bg-primary/12 p-3.5 ring-1 ring-primary/30">
              <p className="text-[11px] font-bold tracking-[0.1em] text-primary uppercase">Keep · {keepPct}%</p>
              <p className="mt-1 font-mono text-[24px] font-semibold tracking-[-0.03em] tabular-nums">
                ${((EXAMPLE * keepPct) / 100).toFixed(0)}
              </p>
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={10000}
            step={500}
            value={keepBps}
            onChange={(e) => setKeepBps(Number(e.target.value))}
            aria-label="Percent to keep"
            aria-valuetext={`Keep ${keepPct} percent`}
            className="mt-5 w-full cursor-pointer"
          />
          <div className="mt-1 flex justify-between text-[12px] text-muted-foreground">
            <span>Spend more</span>
            <span>Keep more</span>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <div>
            <SectionLabel>Waiting period</SectionLabel>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              How long a withdrawal from savings waits before it leaves. Cancel any time before then.
            </p>
          </div>
          <div role="radiogroup" aria-label="Waiting period" className="grid grid-cols-2 gap-2.5">
            {COOLDOWN_PRESETS.map((preset) => {
              const active = preset.seconds === cooldownSeconds;
              return (
                <button
                  key={preset.label}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setCooldownSeconds(preset.seconds)}
                  className={cn(
                    "flex items-center justify-between rounded-[18px] px-4 py-3.5 text-left transition-all active:scale-[0.98]",
                    active ? "bg-primary/12 ring-2 ring-primary" : "bg-card ring-1 ring-hairline hover:bg-surface-2"
                  )}
                >
                  <span>
                    <span className="block text-[15px] font-semibold">{preset.label}</span>
                    <span className="block text-[12px] text-muted-foreground">
                      {preset.seconds === DEMO_COOLDOWN_SECONDS
                        ? "Testnet demo"
                        : preset.seconds === DEFAULT_SETTINGS.cooldownSeconds
                          ? "Default"
                          : "Longer wait"}
                    </span>
                  </span>
                  {active && <CircleCheck className="size-5 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {error && (
          <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-[13px] leading-relaxed text-destructive ring-1 ring-destructive/25">
            {error}
          </p>
        )}
        <Button size="lg" onClick={confirm} disabled={busy} className="w-full">
          {busy && <Loader2 className="animate-spin" />}
          {busy ? "Creating your vault…" : "Create my vault"}
        </Button>
      </div>
    </FlowScreen>
  );
}
