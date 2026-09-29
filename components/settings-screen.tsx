"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Fingerprint, Globe, Moon, PieChart, PlayCircle, ShieldAlert, Smartphone, Sun, Timer, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { getThemeChoice, setThemeChoice, type ThemeChoice } from "@/lib/theme";
import { getCachedAddress } from "@/hooks/use-passkey-wallet";
import { useProfileName } from "@/hooks/use-profile-name";
import { getVaultSettings, DEFAULT_SETTINGS, type VaultSettings } from "@/lib/vault-settings";
import { formatCooldown, shorten } from "@/lib/format";
import { Screen, ScreenHeader, SectionLabel, WalletAvatar } from "./app/screen";
import ProfileSheet from "./profile-sheet";
import { ONBOARDED_KEY } from "./onboarding-carousel";
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
  const [mounted, setMounted] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [settings, setSettings] = useState<VaultSettings>(DEFAULT_SETTINGS);
  const [profileOpen, setProfileOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeChoice>("dark");
  const name = useProfileName();
  const router = useRouter();

  function replayIntro() {
    try {
      localStorage.removeItem(ONBOARDED_KEY);
    } catch {
      // storage blocked: the intro already shows every visit
    }
    router.push("/app");
  }

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
              {address ? shorten(address) : "Not connected"}
            </p>
            {!name && <p className="mt-0.5 text-[12px] font-semibold text-accent">Add your name</p>}
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </Card>
      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} address={address} />

      <Group label="Vault" note="Changing these after setup isn't built yet — it's coming in a later update.">
        <Row icon={<PieChart className="size-[18px]" />} label="Split" value={`Spend ${100 - keepPct}% · Keep ${keepPct}%`} />
        <Row icon={<Timer className="size-[18px]" />} label="Waiting period" value={formatCooldown(settings.cooldownSeconds)} />
      </Group>

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
        <button type="button" onClick={replayIntro} className="w-full text-left active:bg-surface-2">
          <Row
            icon={<PlayCircle className="size-[18px]" />}
            label="Replay intro"
            value={<ChevronRight className="inline size-4" />}
          />
        </button>
      </Group>

      <p className="pt-2 text-center text-[12px] text-muted-foreground">Keep Yours · Get paid. Keep yours.</p>
    </Screen>
  );
}
