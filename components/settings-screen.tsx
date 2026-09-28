"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Fingerprint, Globe, PieChart, ShieldAlert, Timer, Wallet } from "lucide-react";
import { toast } from "sonner";
import { getCachedAddress } from "@/hooks/use-passkey-wallet";
import { getVaultSettings, DEFAULT_SETTINGS, type VaultSettings } from "@/lib/vault-settings";
import { formatCooldown, shorten } from "@/lib/format";
import { Screen, ScreenHeader, SectionLabel, WalletAvatar } from "./app/screen";
import { Card, CardRows } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";

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
  const [mounted, setMounted] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [settings, setSettings] = useState<VaultSettings>(DEFAULT_SETTINGS);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAddress(getCachedAddress());
    setSettings(getVaultSettings() ?? DEFAULT_SETTINGS);
  }, []);

  if (!mounted) return <SettingsSkeleton />;

  const keepPct = Math.round(settings.keepBps / 100);

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

  return (
    <Screen>
      <ScreenHeader title="Settings" />

      <Card className="flex items-center gap-4 p-4">
        <WalletAvatar address={address} size={52} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">Your wallet</p>
          <p className="truncate font-mono text-[13px] text-muted-foreground">
            {address ? shorten(address) : "Not connected"}
          </p>
        </div>
        {address && (
          <Button variant="secondary" size="icon" onClick={copyAddress} aria-label="Copy address">
            {copied ? <Check className="text-primary" /> : <Copy />}
          </Button>
        )}
      </Card>

      <Group label="Vault" note="Changing these after setup isn't built yet — it's coming in a later update.">
        <Row icon={<PieChart className="size-[18px]" />} label="Split" value={`Spend ${100 - keepPct}% · Keep ${keepPct}%`} />
        <Row icon={<Timer className="size-[18px]" />} label="Waiting period" value={formatCooldown(settings.cooldownSeconds)} />
      </Group>

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

      <p className="pt-2 text-center text-[12px] text-muted-foreground">Keep Yours · Get paid. Keep yours.</p>
    </Screen>
  );
}
