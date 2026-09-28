"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_SETTINGS,
  COOLDOWN_PRESETS,
  saveVaultSettings,
  type VaultSettings,
} from "@/lib/vault-settings";

function Logo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-128.png" alt="" width={40} height={40} className="block" />
  );
}

function bpsToPct(bps: number): number {
  return Math.round(bps / 100);
}

export default function SetupScreen() {
  const router = useRouter();
  const [keepBps, setKeepBps] = useState(DEFAULT_SETTINGS.keepBps);
  const [cooldownSeconds, setCooldownSeconds] = useState(DEFAULT_SETTINGS.cooldownSeconds);

  const keepPct = bpsToPct(keepBps);
  const spendPct = 100 - keepPct;

  function confirm() {
    const settings: VaultSettings = { keepBps, cooldownSeconds };
    saveVaultSettings(settings);
    router.push("/app/home");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center gap-10 p-8 pt-16 pb-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo />
        <p className="font-display text-[26px] font-bold">Set up your vault</p>
        <p className="max-w-[38ch] text-sm text-[#8CA497]">
          One setting for now. You can change this later.
        </p>
      </div>

      <section className="flex w-full max-w-[420px] flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-[15px] font-bold">Split on arrival</h3>
          <p className="font-mono text-[13px] text-[#8CA497]">
            Spend {spendPct}% · Keep {keepPct}%
          </p>
        </div>

        <div className="flex h-3 gap-1 overflow-hidden rounded-full">
          <div className="bg-[#62E6A0]" style={{ width: `${spendPct}%` }} />
          <div className="bg-[#16B862]" style={{ width: `${keepPct}%` }} />
        </div>

        <input
          type="range"
          min={0}
          max={10000}
          step={500}
          value={keepBps}
          onChange={(e) => setKeepBps(Number(e.target.value))}
          aria-label="Percent to keep"
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#1E3428] accent-[#16B862]"
        />
      </section>

      <section className="flex w-full max-w-[420px] flex-col gap-4">
        <h3 className="font-display text-[15px] font-bold">Waiting period</h3>
        <p className="text-[13px] leading-relaxed text-[#8CA497]">
          Withdrawals from your savings wait this long, and only ever go to
          your own safe address. Cancel any time before it releases.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {COOLDOWN_PRESETS.map((preset) => {
            const active = preset.seconds === cooldownSeconds;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setCooldownSeconds(preset.seconds)}
                className={
                  "rounded-2xl border px-4 py-3 text-[14px] font-semibold transition " +
                  (active
                    ? "border-[#16B862] bg-[#12211A] text-[#EAF5EF]"
                    : "border-[#1E3428] bg-transparent text-[#8CA497] hover:border-[#2C4A3B]")
                }
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </section>

      <button
        type="button"
        onClick={confirm}
        className="w-full max-w-[420px] rounded-full bg-gradient-to-r from-[#16B862] to-[#62E6A0] py-3.5 text-[15px] font-semibold text-[#03170C]"
      >
        Continue
      </button>
    </main>
  );
}
