// Splits new payments without asking anyone for anything.
//
// process() on a vault is open to anyone and can only do what that vault's
// own settings say, so it doesn't need the owner's passkey. The app keeps a
// throwaway key on the phone that controls a separate, empty smart account
// whose only job is calling process(). If that key ever leaked, the most it
// could do is split someone's payment on time. Network fees are sponsored.
// The keeper (T5.2) does the same job while the app is closed.

import type { Address } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createKernelAccount } from "@zerodev/sdk";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { ENTRY_POINT, KERNEL_VERSION, publicClient, sponsoredClient } from "./zerodev";
import { processCall } from "./vault";

const SPLITTER_KEY = "ky_splitter_key";
let client: ReturnType<typeof sponsoredClient> | null = null;
const inFlight = new Set<string>();

function splitterKey(): `0x${string}` {
  let key = localStorage.getItem(SPLITTER_KEY) as `0x${string}` | null;
  if (!key) {
    key = generatePrivateKey();
    localStorage.setItem(SPLITTER_KEY, key);
  }
  return key;
}

async function getClient() {
  if (client) return client;
  const validator = await signerToEcdsaValidator(publicClient, {
    signer: privateKeyToAccount(splitterKey()),
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
  });
  const account = await createKernelAccount(publicClient, {
    plugins: { sudo: validator },
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_VERSION,
  });
  client = sponsoredClient(account);
  return client;
}

/** Calls process() on `vault`. One at a time per vault; resolves once it's on-chain. */
export async function autoSplit(vault: Address): Promise<void> {
  if (inFlight.has(vault)) return;
  inFlight.add(vault);
  try {
    const c = await getClient();
    const call = processCall(vault);
    await c.sendTransaction({ account: c.account!, chain: c.chain, to: call.to, data: call.data, value: BigInt(0) });
  } finally {
    inFlight.delete(vault);
  }
}
