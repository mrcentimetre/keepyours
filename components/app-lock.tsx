"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Fingerprint, Lock } from "lucide-react";
import { clearAway, getAutoLock, isAutoLockHeld, markAway, shouldLock, withAutoLockHeld } from "@/lib/auto-lock";
import { confirmAppPresence } from "@/lib/zerodev";
import { plainWalletError } from "@/lib/vault";
import { BusyCoin } from "./app/busy-coin";
import { FlowScreen, IconOrb, FlowTitle, FlowBody, BrandMark } from "./app/flow";
import { Button } from "./ui/button";

/**
 * Covers the signed-in screens after the person has been away for their
 * auto-lock time (Settings → Security), until Face ID. Mounted by AppShell
 * on wallet screens only.
 */
export default function AppLock() {
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Before the first paint: a cold open after a long time away never shows balances, even for a frame.
  useLayoutEffect(() => {
    if (shouldLock()) setLocked(true);
    else clearAway();
  }, []);

  useEffect(() => {
    function onVisibility() {
      if (isAutoLockHeld()) return;
      if (document.visibilityState === "hidden") {
        markAway();
        // "Immediately": cover now, so the app switcher's snapshot shows the lock too.
        if (getAutoLock() === 0) setLocked(true);
      } else if (shouldLock()) {
        setLocked(true);
      } else {
        clearAway();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  async function unlock() {
    setBusy(true);
    setError(null);
    try {
      await withAutoLockHeld(confirmAppPresence);
      clearAway();
      setLocked(false);
    } catch (e) {
      setError(plainWalletError(e, "unlock"));
    } finally {
      setBusy(false);
    }
  }

  if (!locked) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-background">
      <FlowScreen>
        <BrandMark />
        <div className="flex flex-1 flex-col justify-center gap-6 py-8">
          <IconOrb>
            <Lock className="size-11" strokeWidth={1.75} />
          </IconOrb>
          <div className="flex flex-col gap-3">
            <FlowTitle>Locked</FlowTitle>
            <FlowBody>Your balances stay hidden until you unlock with Face ID or your fingerprint.</FlowBody>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {error && (
            <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-[13px] leading-relaxed text-destructive ring-1 ring-destructive/25">
              {error}
            </p>
          )}
          <Button size="lg" onClick={unlock} disabled={busy} className="w-full">
            {busy ? <BusyCoin /> : <Fingerprint />}
            {busy ? "Waiting for you…" : "Unlock"}
          </Button>
        </div>
      </FlowScreen>
    </div>
  );
}
