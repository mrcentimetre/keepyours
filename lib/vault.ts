// The only place the app talks to the Keep Yours contracts. Everything the
// screens show about savings is read from here; the phone only caches it.

import { encodeFunctionData, formatUnits, parseAbi, zeroAddress, type Address, type Hex } from "viem";
import { loginPasskeyWallet, publicClient } from "./zerodev";
import { USDC_ADDRESS } from "./usdc";
import { saveVaultSettings } from "./vault-settings";

export const FACTORY = process.env.NEXT_PUBLIC_FACTORY as Address | undefined;
export const POOL = process.env.NEXT_PUBLIC_POOL as Address | undefined;

export function isVaultConfigured(): boolean {
  return Boolean(FACTORY && POOL && USDC_ADDRESS);
}

const CONFIG = "(address spendTo, address safePlace, address guardian, uint16 keepBps, uint32 cooldown)";

export const factoryAbi = parseAbi([
  `function createVault(${CONFIG} cfg) returns (address)`,
  "function predictVault(address owner) view returns (address)",
  "function vaultOf(address owner) view returns (address)",
]);

export const vaultAbi = parseAbi([
  "function process()",
  "function advance(uint256 amount)",
  "function requestWithdraw(uint256 amount)",
  "function cancelWithdraw()",
  "function executeWithdraw()",
  `function config() view returns (${CONFIG})`,
  "function saved() view returns (uint256)",
  "function withdrawable() view returns (uint256)",
  "function unprocessed() view returns (uint256)",
  "function pendingWithdraw() view returns ((uint256 amount, uint64 requestedAt, uint64 releaseAt))",
  "function minCooldown() view returns (uint32)",
]);

export const poolAbi = parseAbi([
  "function owedNow(address vault) view returns (uint256)",
  "function owedMax(address vault) view returns (uint256)",
  "function loans(address vault) view returns (uint128 principal, uint64 start)",
  "function feeBpsNow(address vault) view returns (uint16)",
]);

const usd = (raw: bigint) => Number(formatUnits(raw, 6));

export type VaultState = {
  address: Address;
  keepBps: number;
  cooldownSeconds: number;
  spendTo: Address;
  safePlace: Address;
  saved: number;
  withdrawable: number;
  unprocessed: number;
  pending: { amount: number; requestedAt: number; releaseAt: number } | null; // ms timestamps
  advance: { principal: number; owedNow: number; startedAt: number } | null;
};

export async function predictVault(owner: Address): Promise<Address> {
  return publicClient.readContract({ address: FACTORY!, abi: factoryAbi, functionName: "predictVault", args: [owner] });
}

/** The owner's vault, or null if they haven't created one yet. */
export async function vaultOf(owner: Address): Promise<Address | null> {
  const v = await publicClient.readContract({ address: FACTORY!, abi: factoryAbi, functionName: "vaultOf", args: [owner] });
  return v === zeroAddress ? null : v;
}

export async function readVault(vault: Address): Promise<VaultState> {
  const c = { address: vault, abi: vaultAbi } as const;
  const p = { address: POOL!, abi: poolAbi } as const;
  const [config, saved, withdrawable, unprocessed, pending, loan, owedNow] = await publicClient.multicall({
    allowFailure: false,
    contracts: [
      { ...c, functionName: "config" },
      { ...c, functionName: "saved" },
      { ...c, functionName: "withdrawable" },
      { ...c, functionName: "unprocessed" },
      { ...c, functionName: "pendingWithdraw" },
      { ...p, functionName: "loans", args: [vault] },
      { ...p, functionName: "owedNow", args: [vault] },
    ],
  });
  const [principal, start] = loan;
  const state: VaultState = {
    address: vault,
    keepBps: config.keepBps,
    cooldownSeconds: config.cooldown,
    spendTo: config.spendTo,
    safePlace: config.safePlace,
    saved: usd(saved),
    withdrawable: usd(withdrawable),
    unprocessed: usd(unprocessed),
    pending:
      pending.amount > BigInt(0)
        ? { amount: usd(pending.amount), requestedAt: Number(pending.requestedAt) * 1000, releaseAt: Number(pending.releaseAt) * 1000 }
        : null,
    advance: principal > BigInt(0) ? { principal: usd(principal), owedNow: usd(owedNow), startedAt: Number(start) * 1000 } : null,
  };
  // Screens not yet on-chain still read settings from the phone; keep them in step.
  saveVaultSettings({ keepBps: state.keepBps, cooldownSeconds: state.cooldownSeconds });
  return state;
}

// ── writes ─────────────────────────────────────────────────────

export type Call = { to: Address; data: Hex };

/**
 * Face ID, then one sponsored transaction from the passkey wallet. The live
 * signer only exists for this call. Refuses if the passkey opens a different
 * wallet than the one this phone signed in with.
 */
export async function sendWithPasskey(expected: Address | null, call: Call): Promise<Hex> {
  const wallet = await loginPasskeyWallet("Keep Yours");
  if (expected && wallet.address.toLowerCase() !== expected.toLowerCase()) {
    throw new Error("DIFFERENT_WALLET");
  }
  return wallet.kernelClient.sendTransaction({
    account: wallet.kernelClient.account!,
    chain: wallet.kernelClient.chain,
    to: call.to,
    data: call.data,
    value: BigInt(0),
  });
}

/** Spend share and withdrawals both go to the person's own wallet by default. */
export function createVaultCall(owner: Address, keepBps: number, cooldownSeconds: number): Call {
  return {
    to: FACTORY!,
    data: encodeFunctionData({
      abi: factoryAbi,
      functionName: "createVault",
      args: [{ spendTo: owner, safePlace: owner, guardian: zeroAddress, keepBps, cooldown: cooldownSeconds }],
    }),
  };
}

export function processCall(vault: Address): Call {
  return { to: vault, data: encodeFunctionData({ abi: vaultAbi, functionName: "process" }) };
}

/** Turns SDK, bundler and WebAuthn errors into something a person can act on. */
export function plainTxError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg === "DIFFERENT_WALLET") return "That passkey opens a different wallet than the one on this phone.";
  if (/NotAllowed|cancel|abort/i.test(msg)) return "Face ID was cancelled. Nothing happened.";
  if (/paymaster|sponsor|policy/i.test(msg)) return "Network fees couldn't be covered right now. Try again in a minute.";
  return "That didn't go through. Nothing changed. Try again.";
}
