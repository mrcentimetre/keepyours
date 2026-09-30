"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { isVaultConfigured, predictVault, readVault, vaultOf, type VaultState } from "@/lib/vault";

const POLL_MS = 15_000;

/**
 * The signed-in person's vault. `payTo` is the address clients pay — known
 * even before the vault exists. `state` is null until it exists and is read.
 */
export function useVault(owner: string | null) {
  const [payTo, setPayTo] = useState<Address | null>(null);
  const [state, setState] = useState<VaultState | null>(null);
  const [exists, setExists] = useState<boolean | null>(null);

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

  return { payTo, state, exists, refresh };
}
