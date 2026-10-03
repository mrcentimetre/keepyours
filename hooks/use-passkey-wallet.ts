"use client";

import { useCallback, useState } from "react";
import type { Address } from "viem";
import {
  createPasskeyWallet,
  loginPasskeyWallet,
  forgetWebAuthnKey,
  isZeroDevConfigured,
  type PasskeyWallet,
} from "@/lib/zerodev";
import { setProfileName } from "./use-profile-name";
import { clearCache } from "@/lib/cache";
import { unregisterPush } from "@/lib/push";

const HAS_PASSKEY_KEY = "ky_has_passkey";
const CACHED_ADDRESS_KEY = "ky_wallet_address";
const PASSKEY_NAME = "Keep Yours";

export type WalletStatus = "idle" | "connecting" | "ready" | "error";

export function hasExistingPasskey(): boolean {
  try {
    // A cached address also counts: anyone who signed in before the flag
    // was saved on unlock (see run() below) has one, and shouldn't be shown
    // "Create your wallet" again.
    return (
      localStorage.getItem(HAS_PASSKEY_KEY) === "1" || localStorage.getItem(CACHED_ADDRESS_KEY) !== null
    );
  } catch {
    return false;
  }
}

/**
 * The kernel signer itself only ever lives in memory for the tab that just
 * created/unlocked it — usePasskeyWallet's state resets on every navigation,
 * by design, since a live signer shouldn't be casually persisted. But the
 * address alone is public information (E3's screens just need it to
 * display, e.g. a QR code), so it's cached separately here. Signing a real
 * transaction later still means calling unlock() again for a live client —
 * E5's problem, not this one.
 */
export function getCachedAddress(): Address | null {
  try {
    return localStorage.getItem(CACHED_ADDRESS_KEY) as Address | null;
  } catch {
    return null;
  }
}

/**
 * Sign out of this phone: forget the cached address and the display name,
 * so the app goes back to the sign-in screen. The passkey itself stays in
 * the phone's keychain (only the person can delete that, in Settings →
 * Passwords), and HAS_PASSKEY_KEY stays too, so the gate offers "Sign in
 * with your passkey" rather than "Create a wallet". Funds are untouched —
 * they're on-chain, tied to the passkey, not to this app's storage.
 */
export function signOut() {
  try {
    localStorage.removeItem(CACHED_ADDRESS_KEY);
    localStorage.setItem(HAS_PASSKEY_KEY, "1");
  } catch {}
  forgetWebAuthnKey();
  clearCache();
  void unregisterPush();
  setProfileName("");
}

export function usePasskeyWallet() {
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [wallet, setWallet] = useState<PasskeyWallet | null>(null);
  const [error, setError] = useState<string | null>(null);
  // True only right after a fresh Register — distinguishes "just created"
  // from "just unlocked", so the second-device notice (T2.2) shows once,
  // on creation only, not on every later unlock.
  const [justCreated, setJustCreated] = useState(false);

  const run = useCallback(async (fn: () => Promise<PasskeyWallet>, markCreated: boolean) => {
    setStatus("connecting");
    setError(null);
    try {
      const result = await fn();
      setWallet(result);
      setStatus("ready");
      setJustCreated(markCreated);
      try {
        // On ANY success, not just a fresh create: someone who signs in with
        // an existing passkey ("I already have a passkey") is a returning user
        // too. Only setting this on create meant their next launch showed
        // "Create your wallet" again instead of "Welcome back".
        localStorage.setItem(HAS_PASSKEY_KEY, "1");
        localStorage.setItem(CACHED_ADDRESS_KEY, result.address);
      } catch {
        // fine without persistence; just re-shows "create" next time
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
    justCreated,
    configured: isZeroDevConfigured(),
    create,
    unlock,
  };
}
