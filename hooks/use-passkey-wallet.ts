"use client";

import { useCallback, useState } from "react";
import {
  createPasskeyWallet,
  loginPasskeyWallet,
  isZeroDevConfigured,
  type PasskeyWallet,
} from "@/lib/zerodev";

const HAS_PASSKEY_KEY = "ky_has_passkey";
const PASSKEY_NAME = "Keep Yours";

export type WalletStatus = "idle" | "connecting" | "ready" | "error";

export function hasExistingPasskey(): boolean {
  try {
    return localStorage.getItem(HAS_PASSKEY_KEY) === "1";
  } catch {
    return false;
  }
}

export function usePasskeyWallet() {
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [wallet, setWallet] = useState<PasskeyWallet | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (fn: () => Promise<PasskeyWallet>, markCreated: boolean) => {
    setStatus("connecting");
    setError(null);
    try {
      const result = await fn();
      setWallet(result);
      setStatus("ready");
      if (markCreated) {
        try {
          localStorage.setItem(HAS_PASSKEY_KEY, "1");
        } catch {
          // fine without persistence; just re-shows "create" next time
        }
      }
    } catch (e) {
      setStatus("error");
      // WebAuthn's own errors (e.g. the user cancels the Face ID/Touch ID
      // prompt) are a NotAllowedError DOMException, not something with a
      // useful `.message` for a stranger — keep it plain either way.
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }, []);

  const create = useCallback(() => run(() => createPasskeyWallet(PASSKEY_NAME), true), [run]);
  const unlock = useCallback(() => run(() => loginPasskeyWallet(PASSKEY_NAME), false), [run]);

  return {
    status,
    address: wallet?.address ?? null,
    kernelClient: wallet?.kernelClient ?? null,
    error,
    configured: isZeroDevConfigured(),
    create,
    unlock,
  };
}
