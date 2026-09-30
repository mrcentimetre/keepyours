"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { isVaultConfigured, predictVault, readVault, vaultOf, type VaultState } from "@/lib/vault";
import { autoSplit } from "@/lib/splitter";

const POLL_MS = 15_000;

/**
 * The signed-in person's vault. `payTo` is the address clients pay — known
 * even before the vault exists. `state` is null until it exists and is read.
 * New money is split automatically as soon as it's seen; `splitting` is true
 * meanwhile, and `autoSplitFailed` if that didn't go through (the screen can
 * then offer a manual split).
 */
export function useVault(owner: string | null) {
  const [payTo, setPayTo] = useState<Address | null>(null);
  const [state, setState] = useState<VaultState | null>(null);
  const [exists, setExists] = useState<boolean | null>(null);
  const [splitting, setSplitting] = useState(false);
  const [autoSplitFailed, setAutoSplitFailed] = useState(false);

  const refresh = useCallback(async () => {
    if (!owner || !isVaultConfigured()) return;
    try {
      const vault = await vaultOf(owner as Address);
      setExists(vault !== null);
      if (vault) {
        setPayTo(vault);
        setState(await readVault(vault));
      } else {
        setPayTo(await predictVault(owner as Address));
      }
    } catch {
      // Keep what we had; the next poll tries again.
    }
  }, [owner]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const vault = state?.address;
  const hasNewMoney = (state?.unprocessed ?? 0) > 0;
  useEffect(() => {
    if (!vault || !hasNewMoney || autoSplitFailed) return;
    let cancelled = false;
    setSplitting(true);
    autoSplit(vault)
      .then(() => {
        if (!cancelled) refresh();
      })
      .catch(() => {
        if (!cancelled) setAutoSplitFailed(true);
      })
      // Always clear, even if this effect was superseded, or the spinner could stick.
      .finally(() => setSplitting(false));
    return () => {
      cancelled = true;
    };
  }, [vault, hasNewMoney, autoSplitFailed, refresh]);

  return { payTo, state, exists, refresh, splitting, autoSplitFailed };
}
