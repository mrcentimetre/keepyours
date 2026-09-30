"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { readUsdcBalance } from "@/lib/usdc";

const POLL_MS = 15_000;

/** The wallet's spendable USDC, read from the chain and refreshed every 15s. `null` until the first read. */
export function useUsdcBalance(address: string | null) {
  const [balance, setBalance] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!address) return;
    try {
      setBalance(await readUsdcBalance(address as Address));
    } catch {
      // Keep the last known value; the next poll tries again.
    }
  }, [address]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { balance, refresh };
}
