"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, KeyRound, Loader2, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { usePasskeyWallet, hasExistingPasskey } from "@/hooks/use-passkey-wallet";
import type { Address } from "viem";
import { hasCompletedSetup } from "@/lib/vault-settings";
import { isVaultConfigured, readVault, vaultOf } from "@/lib/vault";
import SecondDeviceNotice from "./second-device-notice";
import { FlowScreen, IconOrb, FlowTitle, FlowBody, BrandMark } from "./app/flow";
import { Button } from "./ui/button";

const SEEN_NOTICE_KEY = "ky_seen_second_device_notice";

/** Past the wallet gate entirely: hand off to Setup (T3.1) on a fresh
 * wallet, or straight to Home (T3.2) for one that's already configured. */
function Redirecting({ address }: { address: Address }) {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let done = hasCompletedSetup();
      if (isVaultConfigured()) {
        try {
          const vault = await vaultOf(address);
          done = vault !== null;
          if (vault) await readVault(vault); // caches its settings for the screens
        } catch {
          // Chain unreachable: fall back to what this phone remembers.
        }
      }
      if (!cancelled) router.replace(done ? "/app/home" : "/app/setup");
    })();
    return () => {
      cancelled = true;
    };
  }, [router, address]);
  return null;
}

function Point({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent">{icon}</span>
      <div>
        <p className="text-[14px] font-semibold">{title}</p>
        <p className="text-[13px] leading-snug text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

export default function WalletGate() {
  const [mounted, setMounted] = useState(false);
  const [returning, setReturning] = useState(false);
  const [noticeSeen, setNoticeSeen] = useState(false);
  const { status, address, error, justCreated, configured, create, unlock } = usePasskeyWallet();

  useEffect(() => {
    setMounted(true);
    setReturning(hasExistingPasskey());
    try {
      setNoticeSeen(localStorage.getItem(SEEN_NOTICE_KEY) === "1");
    } catch {
      // fine without persistence; just shows the notice again next time
    }
  }, []);

  function dismissNotice() {
    try {
      localStorage.setItem(SEEN_NOTICE_KEY, "1");
    } catch {
      // ditto
    }
    setNoticeSeen(true);
  }

  if (!mounted) return null;

  if (!configured) {
    return (
      <FlowScreen glow="warning">
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <IconOrb tone="warning">
            <TriangleAlert className="size-10" />
          </IconOrb>
          <FlowTitle className="text-[28px]">Wallet not configured</FlowTitle>
          <FlowBody className="max-w-[36ch]">
            Set NEXT_PUBLIC_ZERODEV_RPC_URL and NEXT_PUBLIC_ZERODEV_PASSKEY_SERVER_URL in .env.local.
          </FlowBody>
        </div>
      </FlowScreen>
    );
  }

  if (status === "ready" && address && justCreated && !noticeSeen) {
    return <SecondDeviceNotice onContinue={dismissNotice} />;
  }

  if (status === "ready" && address) {
    return <Redirecting address={address} />;
  }

  const busy = status === "connecting";

  return (
    <FlowScreen>
      <BrandMark />

      <div className="flex flex-1 flex-col justify-center gap-8 py-8">
        <IconOrb>
          <Fingerprint className="size-12" strokeWidth={1.75} />
        </IconOrb>
        <div className="flex flex-col gap-3">
          <FlowTitle>{returning ? "Welcome back" : "Create your wallet"}</FlowTitle>
          <FlowBody>
            {returning
              ? "Unlock with the passkey on this device — Face ID or your fingerprint."
              : "One passkey — Face ID or your fingerprint — is your whole wallet."}
          </FlowBody>
        </div>

        {!returning && (
          <div className="flex flex-col gap-4">
            <Point icon={<KeyRound className="size-[18px]" />} title="No seed phrase" body="Nothing to write down, nothing to lose on paper." />
            <Point icon={<ShieldCheck className="size-[18px]" />} title="Only you can move it" body="We never see your passkey or hold your money." />
            <Point icon={<Sparkles className="size-[18px]" />} title="No gas to buy" body="Network fees are covered, so you start with just USDC." />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {status === "error" && error && (
          <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-[13px] leading-relaxed text-destructive ring-1 ring-destructive/25">
            {error}
          </p>
        )}
        <Button size="lg" onClick={returning ? unlock : create} disabled={busy} className="w-full">
          {busy ? <Loader2 className="animate-spin" /> : <Fingerprint />}
          {busy ? "Waiting for you…" : returning ? "Unlock" : "Create passkey"}
        </Button>
        {!returning && (
          <Button variant="ghost" size="sm" onClick={() => setReturning(true)} className="self-center">
            I already have a passkey on this device
          </Button>
        )}
      </div>
    </FlowScreen>
  );
}
