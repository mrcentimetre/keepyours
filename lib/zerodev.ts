import { createPublicClient, http, type Address } from "viem";
import { arbitrumSepolia } from "viem/chains";
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
  type KernelAccountClient,
} from "@zerodev/sdk";
// Not re-exported from the package root — only under this subpath.
import { getEntryPoint, KERNEL_V3_1 } from "@zerodev/sdk/constants";
import {
  toPasskeyValidator,
  toWebAuthnKey,
  WebAuthnMode,
  PasskeyValidatorContractVersion,
} from "@zerodev/passkey-validator";
import type { WebAuthnKey } from "@zerodev/webauthn-key";

// The passkey's PUBLIC key, remembered after the first create/unlock. It
// can't sign anything; it only saves the separate login ceremony, so each
// transaction asks for Face ID once (to sign) instead of twice.
const WEBAUTHN_KEY = "ky_webauthn_key";

function saveWebAuthnKey(k: WebAuthnKey) {
  try {
    localStorage.setItem(
      WEBAUTHN_KEY,
      JSON.stringify({
        ...k,
        pubX: k.pubX.toString(),
        pubY: k.pubY.toString(),
        signMessageCallback: undefined,
        // The SDK always returns rpID "", so record the domain ourselves.
        host: window.location.hostname,
      })
    );
  } catch {}
}

function loadWebAuthnKey(): WebAuthnKey | null {
  try {
    const raw = localStorage.getItem(WEBAUTHN_KEY);
    if (!raw) return null;
    const k = JSON.parse(raw);
    // Passkeys belong to one domain; a key saved on another one is useless here.
    if (k.host !== window.location.hostname) return null;
    const { host: _host, ...key } = k;
    return { ...key, pubX: BigInt(k.pubX), pubY: BigInt(k.pubY) };
  } catch {
    return null;
  }
}

function base64UrlToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/").padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "=");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Face ID / fingerprint against this wallet's own passkey: proves a person is
 * opening the app. Nothing is signed for the chain; it only gates the screen,
 * so the challenge can be local. Throws if cancelled or it's a different passkey.
 */
async function confirmPresence(key: WebAuthnKey) {
  await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: window.location.hostname,
      allowCredentials: [{ id: base64UrlToBytes(key.authenticatorId), type: "public-key" }],
      userVerification: "required",
      timeout: 60_000,
    },
  });
}

/**
 * Unlock on app open: always one Face ID. With the public key remembered
 * that's a presence check on this passkey; without it, the full login
 * (which is itself the one prompt).
 */
export async function unlockPasskeyWallet(passkeyName: string): Promise<PasskeyWallet> {
  const cached = loadWebAuthnKey();
  if (cached) await confirmPresence(cached);
  return buildWallet(WebAuthnMode.Login, passkeyName);
}

/** Sign out forgets it too, so the next unlock does the full login again. */
export function forgetWebAuthnKey() {
  try {
    localStorage.removeItem(WEBAUTHN_KEY);
  } catch {}
}

// Testnet for now (E2/E3 of docs/BUILD-PLAN.md). Arbitrum One comes with the
// real deploy in E5 — likely a second ZeroDev project, see docs/ARCHITECTURE.md.
export const chain = arbitrumSepolia;

// One v3 URL serves as both the bundler and the paymaster transport — this
// is what the ZeroDev dashboard actually hands out now (verified against the
// real project the RPC URL came from, 28 Sep 2026); the v2 paymaster-only
// URL shape in ZeroDev's own SDK source comments is stale.
const RPC_URL = process.env.NEXT_PUBLIC_ZERODEV_RPC_URL;
// The passkey registration/login ceremony is verified server-side (standard
// WebAuthn: a server must issue and check the challenge). This is a ZeroDev-
// hosted URL from the dashboard, not something computed from the project ID
// — confirmed by reading @zerodev/webauthn-key's own source, not assumed.
const PASSKEY_SERVER_URL = process.env.NEXT_PUBLIC_ZERODEV_PASSKEY_SERVER_URL;

// Kernel v3.1: a stable version in the range @zerodev/passkey-validator's
// V0_0_3_PATCHED validator supports ("0.3.0 || 0.3.1 || 0.3.2 || 0.3.3").
// Must stay the same version everywhere a Kernel version is passed below.
const KERNEL_VERSION = KERNEL_V3_1;
const ENTRY_POINT = getEntryPoint("0.7");

export function isZeroDevConfigured(): boolean {
  return Boolean(RPC_URL && PASSKEY_SERVER_URL);
}

export const publicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

export type PasskeyWallet = {
  address: Address;
  kernelClient: KernelAccountClient;
};

async function buildWallet(mode: WebAuthnMode, passkeyName: string): Promise<PasskeyWallet> {
  if (!RPC_URL || !PASSKEY_SERVER_URL) {
    throw new Error(
      "ZeroDev is not configured. Set NEXT_PUBLIC_ZERODEV_RPC_URL and NEXT_PUBLIC_ZERODEV_PASSKEY_SERVER_URL."
    );
  }

  const cached = mode === WebAuthnMode.Login ? loadWebAuthnKey() : null;
  const webAuthnKey =
    cached ??
    (await toWebAuthnKey({
      passkeyName,
      passkeyServerUrl: PASSKEY_SERVER_URL,
      mode,
    }));
  if (!cached) saveWebAuthnKey(webAuthnKey);

  const passkeyValidator = await toPasskeyValidator(publicClient, {
    webAuthnKey,
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
    validatorContractVersion: PasskeyValidatorContractVersion.V0_0_3_PATCHED,
  });

  const account = await createKernelAccount(publicClient, {
    plugins: { sudo: passkeyValidator },
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
  });

  return { address: account.address, kernelClient: sponsoredClient(account) };
}

/** A Kernel account client whose network fees the ZeroDev paymaster covers. */
export function sponsoredClient(account: Parameters<typeof createKernelAccountClient>[0]["account"]) {
  const paymasterClient = createZeroDevPaymasterClient({
    chain,
    transport: http(RPC_URL),
  });
  return createKernelAccountClient({
    account,
    chain,
    bundlerTransport: http(RPC_URL),
    client: publicClient,
    paymaster: {
      getPaymasterData: (userOperation) => paymasterClient.sponsorUserOperation({ userOperation }),
    },
  });
}

export { ENTRY_POINT, KERNEL_VERSION };

/** First open: creates the passkey (one Face ID/Touch ID prompt) and the wallet with it. */
export function createPasskeyWallet(passkeyName: string): Promise<PasskeyWallet> {
  return buildWallet(WebAuthnMode.Register, passkeyName);
}

/** Later opens: a single "Unlock" — re-authenticates with the existing passkey. */
export function loginPasskeyWallet(passkeyName: string): Promise<PasskeyWallet> {
  return buildWallet(WebAuthnMode.Login, passkeyName);
}
