"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { isHydrated } from "@/lib/hydrated";
import type { Address } from "viem";
import { toast } from "sonner";
import { ChevronRight, Fingerprint, Globe, Moon, PieChart, ShieldAlert, Smartphone, Sun, Timer, Wallet } from "lucide-react";
import { BusyCoin } from "./app/busy-coin";
import { cn } from "@/lib/utils";
import { getThemeChoice, setThemeChoice, type ThemeChoice } from "@/lib/theme";
import { getCachedAddress } from "@/hooks/use-passkey-wallet";
import { useProfileName } from "@/hooks/use-profile-name";
import { useVault } from "@/hooks/use-vault";
import {
  applySettingsCall,
  isVaultConfigured,
  plainTxError,
  proposeSettingsCall,
  sendWithPasskey,
} from "@/lib/vault";
import { reportError, track } from "@/lib/analytics";
import VaultSettingsSheet from "./vault-settings-sheet";
import InProgressCard, { humanDuration } from "./app/in-progress-card";
import { CooldownIcon } from "./waitlist/feature-icons";
import { Button } from "./ui/button";
import { getVaultSettings, DEFAULT_SETTINGS, type VaultSettings } from "@/lib/vault-settings";
import { formatCooldown, shorten } from "@/lib/format";
import { Screen, ScreenHeader, SectionLabel, WalletAvatar } from "./app/screen";
import ProfileSheet from "./profile-sheet";
import { Card, CardRows } from "./ui/card";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";

const THEMES = [
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "Auto", Icon: Smartphone },
] as const satisfies readonly { value: ThemeChoice; label: string; Icon: unknown }[];

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted-foreground">
        {icon}
      </span>
      <span className="flex-1 text-[14px]">{label}</span>
      <span className="text-right text-[14px] text-muted-foreground">{value}</span>
    </div>
  );
}

function Group({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel className="px-1">{label}</SectionLabel>
      <Card>
        <CardRows>{children}</CardRows>
      </Card>
      {note && <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">{note}</p>}
    </section>
  );
}

function SettingsSkeleton() {
  return (
    <Screen>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-[88px]" />
      <Skeleton className="h-[150px]" />
      <Skeleton className="h-[110px]" />
    </Screen>
  );
}

export default function SettingsScreen() {
  // Arriving by navigation (not a cold open): render real content on the first
  // frame, so the screen transition slides content, not an empty page.
  const [returning] = useState(isHydrated);
  const [mounted, setMounted] = useState(returning);
  const [address, setAddress] = useState<string | null>(() => (returning ? getCachedAddress() : null));
  const [settings, setSettings] = useState<VaultSettings>(DEFAULT_SETTINGS);
  const [profileOpen, setProfileOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeChoice>("dark");
  const name = useProfileName();
  // Settings and the shown address come from the vault once it exists.
  const { payTo, state: vault, refresh: refreshVault } = useVault(address);
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState<"apply" | "cancel" | null>(null);
  const [now, setNow] = useState(Date.now());

  // Tick the countdown while a settings change is waiting.
  useEffect(() => {
    if (!vault?.pendingSettings) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [vault?.pendingSettings]);

  async function runPending(kind: "apply" | "cancel") {
    if (!vault) return;
    setBusy(kind);
    try {
      // Cancelling = re-proposing what's in force now, which isn't weaker, so
      // it applies at once and clears the waiting change.
      const call =
        kind === "apply" ? applySettingsCall(vault.address) : proposeSettingsCall(vault, vault.keepBps, vault.cooldownSeconds);
      await sendWithPasskey(address as Address, call);
      track(kind === "apply" ? "settings_applied" : "settings_cancelled");
      toast.success(kind === "apply" ? "Settings updated" : "Change cancelled. Nothing changed.");
      await refreshVault();
    } catch (e) {
      toast.error(plainTxError(e));
      track("tx_failed", { action: `settings_${kind}`, reason: plainTxError(e) });
      reportError(e, `settings_${kind}`);
    } finally {
      setBusy(null);
    }
  }

  useLayoutEffect(() => {
    if (vault) setSettings({ keepBps: vault.keepBps, cooldownSeconds: vault.cooldownSeconds });
  }, [vault]);

  useEffect(() => {
    setMounted(true);
    setTheme(getThemeChoice());
    setAddress(getCachedAddress());
    setSettings(getVaultSettings() ?? DEFAULT_SETTINGS);
  }, []);

  if (!mounted) return <SettingsSkeleton />;

  const keepPct = Math.round(settings.keepBps / 100);

  return (
    <Screen>
      <ScreenHeader title="Settings" />

      <Card className="overflow-hidden">
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          className="flex w-full items-center gap-4 p-4 text-left transition-colors active:bg-surface-2"
        >
          <WalletAvatar address={address} size={52} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{name || "Your wallet"}</p>
            <p className="truncate font-mono text-[13px] text-muted-foreground">
              {(isVaultConfigured() ? payTo : address) ? shorten((isVaultConfigured() ? payTo : address)!) : "…"}
            </p>
            {!name && <p className="mt-0.5 text-[12px] font-semibold text-accent">Add your name</p>}
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </Card>
      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} address={address} />

      {vault?.pendingSettings &&
        (() => {
          const p = vault.pendingSettings;
          const ready = now >= p.applyAt;
          const keep = Math.round(p.keepBps / 100);
          // A waiting change always waits the cooldown in force when it was asked for.
          const total = vault.cooldownSeconds * 1000;
          return (
            <InProgressCard
              Icon={CooldownIcon}
              label={`Settings change · ${formatCooldown(p.cooldownSeconds)} waiting period`}
              headline={`Spend ${100 - keep}% · Keep ${keep}%`}
              status={ready ? "Ready" : humanDuration(p.applyAt - now)}
              sub={ready ? "Apply when you like" : "until it can apply"}
              tone={ready ? "primary" : "warning"}
              progress={total > 0 ? 1 - (p.applyAt - now) / total : 1}
            >
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => runPending("cancel")}>
                  {busy === "cancel" && <BusyCoin />}
                  Cancel change
                </Button>
                <Button size="sm" disabled={!ready || busy !== null} onClick={() => runPending("apply")}>
                  {busy === "apply" && <BusyCoin />}
                  {ready ? "Apply now" : "Not yet"}
                </Button>
              </div>
            </InProgressCard>
          );
        })()}

      <Group
        label="Vault"
        note={
          vault
            ? "Keeping more or waiting longer applies at once. Keeping less or waiting less waits out your current waiting period first."
            : undefined
        }
      >
        {vault && vault.guardian !== undefined ? (
          <>
            <button type="button" onClick={() => setEditOpen(true)} className="w-full text-left active:bg-surface-2">
              <Row
                icon={<PieChart className="size-[18px]" />}
                label="Split"
                value={
                  <span className="inline-flex items-center gap-1">
                    Spend {100 - keepPct}% · Keep {keepPct}% <ChevronRight className="size-4" />
                  </span>
                }
              />
            </button>
            <button type="button" onClick={() => setEditOpen(true)} className="w-full text-left active:bg-surface-2">
              <Row
                icon={<Timer className="size-[18px]" />}
                label="Waiting period"
                value={
                  <span className="inline-flex items-center gap-1">
                    {formatCooldown(settings.cooldownSeconds)} <ChevronRight className="size-4" />
                  </span>
                }
              />
            </button>
          </>
        ) : (
          <>
            <Row icon={<PieChart className="size-[18px]" />} label="Split" value={`Spend ${100 - keepPct}% · Keep ${keepPct}%`} />
            <Row icon={<Timer className="size-[18px]" />} label="Waiting period" value={formatCooldown(settings.cooldownSeconds)} />
          </>
        )}
      </Group>
      {vault && (
        <VaultSettingsSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          owner={address}
          vault={vault}
          onChanged={refreshVault}
        />
      )}

      <section className="flex flex-col gap-2">
        <SectionLabel className="px-1">Appearance</SectionLabel>
        <Card className="grid grid-cols-3 gap-1.5 p-1.5" role="radiogroup" aria-label="Appearance">
          {THEMES.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={theme === value}
              onClick={() => {
                setTheme(value);
                setThemeChoice(value);
              }}
              className={cn(
                "flex h-12 items-center justify-center gap-2 rounded-[16px] text-[14px] font-semibold transition-colors",
                theme === value ? "bg-primary text-primary-foreground shadow-brand" : "text-muted-foreground"
              )}
            >
              <Icon className="size-[18px]" aria-hidden="true" />
              {label}
            </button>
          ))}
        </Card>
        <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
          On iPhone, the clock bar matches after you reopen the app.
        </p>
      </section>

      <Group label="Security">
        <Row icon={<Fingerprint className="size-[18px]" />} label="Sign-in" value="Passkey on this device" />
        <Row icon={<Wallet className="size-[18px]" />} label="Custody" value="Only you can move funds" />
      </Group>

      <Group label="About">
        <Row icon={<Globe className="size-[18px]" />} label="Network" value="Arbitrum Sepolia" />
        <Row
          icon={<ShieldAlert className="size-[18px]" />}
          label="Contracts"
          value={<Badge variant="warning">Unaudited</Badge>}
        />
      </Group>

      <div className="pt-2 text-center text-[12px] text-muted-foreground">
        <p>Keep Yours · Get paid. Keep yours.</p>
        {(process.env.NEXT_PUBLIC_APP_VERSION || process.env.NEXT_PUBLIC_APP_COMMIT) && (
          <p className="mt-1 font-mono text-[11px] tabular-nums opacity-80">
            {process.env.NEXT_PUBLIC_APP_VERSION ? `v${process.env.NEXT_PUBLIC_APP_VERSION}` : "dev"}
            {process.env.NEXT_PUBLIC_APP_COMMIT ? ` · ${process.env.NEXT_PUBLIC_APP_COMMIT}` : ""}
          </p>
        )}
      </div>
    </Screen>
  );
}
