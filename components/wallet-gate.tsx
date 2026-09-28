"use client";

import { useEffect, useState } from "react";
import { usePasskeyWallet, hasExistingPasskey } from "@/hooks/use-passkey-wallet";
import SecondDeviceNotice from "./second-device-notice";

const SEEN_NOTICE_KEY = "ky_seen_second_device_notice";

function Logo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-128.png" alt="" width={40} height={40} className="block" />
  );
}

function shorten(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
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
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-8 text-center">
        <Logo />
        <p className="font-display text-2xl font-bold">Wallet not configured</p>
        <p className="max-w-[42ch] text-sm text-[#8CA497]">
          Set NEXT_PUBLIC_ZERODEV_RPC_URL and NEXT_PUBLIC_ZERODEV_PASSKEY_SERVER_URL
          in .env.local.
        </p>
      </main>
    );
  }

  if (status === "ready" && address && justCreated && !noticeSeen) {
    return <SecondDeviceNotice onContinue={dismissNotice} />;
  }

  if (status === "ready" && address) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-8 text-center">
        <Logo />
        <p className="font-display text-2xl font-bold">You&rsquo;re in</p>
        <p className="font-mono text-sm text-[#62E6A0]">{shorten(address)}</p>
        <p className="max-w-[42ch] text-sm text-[#8CA497]">
          Setup, home, withdraw and advance screens land next. This is a placeholder.
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <Logo />
        <p className="font-display text-[26px] font-bold">
          {returning ? "Welcome back" : "Create your wallet"}
        </p>
        <p className="max-w-[38ch] text-sm text-[#8CA497]">
          {returning
            ? "Unlock with the passkey on this device."
            : "One passkey — Face ID or your fingerprint — creates your wallet. No seed phrase, and we never see it."}
        </p>
      </div>

      <button
        type="button"
        onClick={returning ? unlock : create}
        disabled={status === "connecting"}
        className="rounded-full bg-gradient-to-r from-[#16B862] to-[#62E6A0] px-8 py-3.5 text-[15px] font-semibold text-[#03170C] disabled:opacity-60"
      >
        {status === "connecting" ? "Waiting for you…" : returning ? "Unlock" : "Create passkey"}
      </button>

      {status === "error" && error && (
        <p className="max-w-[38ch] text-sm text-[#FF7070]">{error}</p>
      )}

      {!returning && (
        <button
          type="button"
          onClick={() => setReturning(true)}
          className="text-[13px] text-[#8CA497] underline decoration-[#2C4A3B] underline-offset-4 hover:text-[#BFD8C9]"
        >
          I already have a passkey on this device
        </button>
      )}
    </main>
  );
}
