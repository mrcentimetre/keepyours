"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { readUsdcBalance } from "@/lib/usdc";
import { readCache, writeCache } from "@/lib/cache";

const POLL_MS = 15_000;

/** The wallet's spendable USDC, read from the chain and refreshed every 15s. `null` until the first read. */
export function useUsdcBalance(address: string | null) {
  const key = `balance:${address}`;
  const [balance, setBalance] = useState<number | null>(() => (address ? readCache<number>(key) : null));

  // The address arrives after mount; show its cached balance as soon as it does.
  useEffect(() => {
    if (address) setBalance((b) => b ?? readCache<number>(key));
  }, [address, key]);

  const refresh = useCallback(async () => {
    if (!address) return;
    try {
      const next = await readUsdcBalance(address as Address);
      writeCache(key, next);
      setBalance(next);
    } catch {
      // Keep the last known value; the next poll tries again.
    }
  }, [address, key]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { balance, refresh };
}
