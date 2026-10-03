"use client";

import { useEffect, useState } from "react";
import type { Address } from "viem";
import { CircleCheck, ShieldCheck, Timer } from "lucide-react";
import { BusyCoin } from "./app/busy-coin";
import { toast } from "sonner";
import { COOLDOWN_PRESETS } from "@/lib/vault-settings";
import { isWeakerChange, plainTxError, proposeSettingsCall, sendWithPasskey, type VaultState } from "@/lib/vault";
import { formatCooldown, formatDateTime } from "@/lib/format";
import { reportError, track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { SectionLabel } from "./app/screen";
import SlideToConfirm from "./slide-to-confirm";
import { Button } from "./ui/button";
import { Sheet, SheetContent } from "./ui/sheet";

/**
 * Change the split and waiting period on the vault. Stronger changes apply at
 * once; weaker ones wait out the current waiting period (the contract's rule),
 * and the sheet says which before anything is signed.
 */
export default function VaultSettingsSheet({
  open,
  onOpenChange,
  owner,
  vault,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owner: string | null;
  vault: VaultState;
  onChanged: () => void;
}) {
  const [keepBps, setKeepBps] = useState(vault.keepBps);
  const [cooldown, setCooldown] = useState(vault.cooldownSeconds);
  const [busy, setBusy] = useState(false);
  const [slideKey, setSlideKey] = useState(0);

  // Each opening starts from what's on-chain now.
  useEffect(() => {
    if (open) {
      setKeepBps(vault.keepBps);
      setCooldown(vault.cooldownSeconds);
    }
  }, [open, vault.keepBps, vault.cooldownSeconds]);

  const keepPct = Math.round(keepBps / 100);
  const changed = keepBps !== vault.keepBps || cooldown !== vault.cooldownSeconds;
  const weaker = isWeakerChange(vault, keepBps, cooldown);
  const appliesAt = Date.now() + vault.cooldownSeconds * 1000;
  // Presets plus the current value, in case it's one the presets don't list.
  const presets = COOLDOWN_PRESETS.some((p) => p.seconds === vault.cooldownSeconds)
    ? COOLDOWN_PRESETS
    : [...COOLDOWN_PRESETS, { label: formatCooldown(vault.cooldownSeconds), seconds: vault.cooldownSeconds }];

  async function confirm() {
    if (!changed || busy) return;
    setBusy(true);
    try {
      await sendWithPasskey(owner as Address, proposeSettingsCall(vault, keepBps, cooldown));
      track(weaker ? "settings_proposed" : "settings_applied");
      toast.success(weaker ? `Change saved. It applies ${formatDateTime(appliesAt)}.` : "Settings updated");
      onChanged();
      onOpenChange(false);
    } catch (e) {
      toast.error(plainTxError(e));
      track("tx_failed", { action: "settings", reason: plainTxError(e) });
      reportError(e, "settings");
      setSlideKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <SheetContent title="Change vault settings">
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-baseline justify-between">
              <SectionLabel>Split every payment</SectionLabel>
              <span className="font-mono text-[13px] font-semibold tabular-nums">
                Spend {100 - keepPct}% · Keep {keepPct}%
              </span>
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
              className="mt-4 w-full cursor-pointer"
            />
            <div className="mt-1 flex justify-between text-[12px] text-muted-foreground">
              <span>Spend more</span>
              <span>Keep more</span>
            </div>
          </div>

          <div>
            <SectionLabel>Waiting period</SectionLabel>
            <div role="radiogroup" aria-label="Waiting period" className="mt-3 grid grid-cols-2 gap-2">
              {presets.map((p) => {
                const active = p.seconds === cooldown;
                return (
                  <button
                    key={p.seconds}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setCooldown(p.seconds)}
                    className={cn(
                      "flex items-center justify-between rounded-2xl px-4 py-3 text-left text-[14px] font-semibold transition-all active:scale-[0.98]",
                      active ? "bg-primary/12 ring-2 ring-primary" : "bg-surface-2 ring-1 ring-hairline"
                    )}
                  >
                    {p.label}
                    {active && <CircleCheck className="size-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          {changed &&
            (weaker ? (
              <div className="flex gap-3 rounded-2xl bg-warning/10 px-4 py-3 ring-1 ring-warning/25">
                <Timer className="mt-0.5 size-5 shrink-0 text-warning" />
                <p className="text-[13px] leading-relaxed">
                  <span className="font-semibold">Waits {formatCooldown(vault.cooldownSeconds)} before it applies</span>
                  <span className="text-muted-foreground">
                    {" "}
                    (about {formatDateTime(appliesAt)}). Keeping less or waiting less is held back on purpose: it
                    protects your savings if someone else ever gets into your phone.
                    {vault.pendingSettings ? " This replaces the change already waiting." : ""}
                  </span>
                </p>
              </div>
            ) : (
              <div className="flex gap-3 rounded-2xl bg-primary/10 px-4 py-3 ring-1 ring-primary/25">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                <p className="text-[13px] leading-relaxed">
                  <span className="font-semibold">Applies right away.</span>
                  <span className="text-muted-foreground"> It makes your savings safer, so there's nothing to wait for.</span>
                </p>
              </div>
            ))}

          {!changed ? (
            <Button size="lg" disabled className="w-full">
              Nothing changed yet
            </Button>
          ) : busy ? (
            <Button size="lg" disabled className="w-full">
              <BusyCoin />
              Saving…
            </Button>
          ) : (
            <SlideToConfirm key={slideKey} label={weaker ? "Slide to request" : "Slide to update"} onConfirm={confirm} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
