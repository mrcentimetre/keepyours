// Activity is read straight from the chain: the vault's and pool's own events
// plus the wallet's USDC transfers. Nothing is stored anywhere else.

import { createPublicClient, formatUnits, http, parseAbiItem, type Address, type Hex } from "viem";
import { chain } from "./zerodev";
import { FACTORY, POOL } from "./vault";
import { USDC_ADDRESS } from "./usdc";

// Public RPC for history: it answers wide block ranges for one address quickly.
const logs = createPublicClient({ chain, transport: http("https://sepolia-rollup.arbitrum.io/rpc") });

// First block of the Arbitrum Sepolia deployment (docs/DEPLOYMENTS.md).
const DEPLOY_BLOCK = BigInt(314160190);
const usd = (raw: bigint) => Number(formatUnits(raw, 6));

export type ActivityKind =
  | "payment"
  | "received"
  | "sent"
  | "advance"
  | "repaid"
  | "settled"
  | "withdraw-requested"
  | "withdraw-cancelled"
  | "withdrawn";

/** What a phone notification says for each kind of on-chain event. */
export function notificationText(i: { kind: ActivityKind; amount: number; detail?: string }): { title: string; body: string } {
  const $ = `$${i.amount.toFixed(2)}`;
  switch (i.kind) {
    case "payment":
      return { title: `${$} received`, body: i.detail ?? "Split into spend and keep." };
    case "received":
      return { title: `${$} received in your wallet`, body: "Sent straight to your wallet, so it wasn't split." };
    case "sent":
      return { title: `${$} sent`, body: i.detail ? `Sent ${i.detail}.` : "Sent from your wallet." };
    case "advance":
      return { title: `${$} advance taken`, body: "It's in your wallet. Your next payment repays it first." };
    case "repaid":
      return { title: `Advance repaid · ${$}`, body: i.detail ?? "Your savings are free again." };
    case "settled":
      return { title: `Advance settled · ${$}`, body: "Taken from your savings after day 90." };
    case "withdraw-requested":
      return { title: `Withdrawal of ${$} started`, body: "If this wasn't you, open Keep Yours and cancel it." };
    case "withdraw-cancelled":
      return { title: `Withdrawal of ${$} cancelled`, body: "Your savings stay put." };
    case "withdrawn":
      return { title: `${$} withdrawn`, body: "It's in your wallet now." };
  }
}

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  amount: number;
  at: number; // ms
  tx: Hex;
  detail?: string;
  /** Payments only: how the split went. */
  kept?: number;
  repaid?: number;
  /** Sends only: who it went to. */
  to?: Address;
};

const ev = {
  created: parseAbiItem("event VaultCreated(address indexed owner, address vault, uint16 keepBps, uint32 cooldown)"),
  processed: parseAbiItem("event Processed(address indexed vault, uint256 amount, uint256 repaid, uint256 spent, uint256 kept)"),
  advanced: parseAbiItem("event Advanced(address indexed vault, uint256 amount)"),
  requested: parseAbiItem("event WithdrawRequested(address indexed vault, uint256 amount, uint64 releaseAt)"),
  cancelled: parseAbiItem("event WithdrawCancelled(address indexed vault, uint256 amount)"),
  withdrawn: parseAbiItem("event Withdrawn(address indexed vault, uint256 amount, address to)"),
  repaid: parseAbiItem("event AdvanceRepaid(address indexed vault, uint256 principal, uint256 fee)"),
  settled: parseAbiItem("event Settled(address indexed vault, uint256 owed)"),
  transfer: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)"),
};

let createdBlock: { owner: string; block: bigint } | null = null;

async function vaultCreatedBlock(owner: Address): Promise<bigint> {
  if (createdBlock?.owner === owner) return createdBlock.block;
  const found = await logs.getLogs({ address: FACTORY!, event: ev.created, args: { owner }, fromBlock: DEPLOY_BLOCK });
  const block = found[0]?.blockNumber ?? DEPLOY_BLOCK;
  createdBlock = { owner, block };
  return block;
}

/** Newest first. */
export async function readActivity(owner: Address, vault: Address): Promise<ActivityItem[]> {
  const fromBlock = await vaultCreatedBlock(owner);
  const onVault = { address: vault, fromBlock } as const;
  const [processed, advanced, requested, cancelled, withdrawn, repaid, settled, into, out] = await Promise.all([
    logs.getLogs({ ...onVault, event: ev.processed }),
    logs.getLogs({ ...onVault, event: ev.advanced }),
    logs.getLogs({ ...onVault, event: ev.requested }),
    logs.getLogs({ ...onVault, event: ev.cancelled }),
    logs.getLogs({ ...onVault, event: ev.withdrawn }),
    logs.getLogs({ address: POOL!, event: ev.repaid, args: { vault }, fromBlock }),
    logs.getLogs({ address: POOL!, event: ev.settled, args: { vault }, fromBlock }),
    logs.getLogs({ address: USDC_ADDRESS!, event: ev.transfer, args: { to: owner }, fromBlock }),
    logs.getLogs({ address: USDC_ADDRESS!, event: ev.transfer, args: { from: owner }, fromBlock }),
  ]);

  // Transfers the vault or pool already explain (spend share, advances,
  // withdrawals, early repayments) would show twice, so skip them.
  const own = new Set([vault.toLowerCase(), POOL!.toLowerCase()]);
  type Draft = Omit<ActivityItem, "at"> & { block: bigint };
  const items: Draft[] = [];
  const base = (l: { transactionHash: Hex; logIndex: number; blockNumber: bigint }) => ({
    id: `${l.transactionHash}-${l.logIndex}`,
    tx: l.transactionHash,
    block: l.blockNumber,
  });

  for (const l of processed) {
    const a = l.args;
    const parts = [`$${usd(a.kept!).toFixed(2)} kept`, `$${usd(a.spent!).toFixed(2)} to spend`];
    if (a.repaid! > BigInt(0)) parts.unshift(`$${usd(a.repaid!).toFixed(2)} repaid`);
    items.push({
      ...base(l),
      kind: "payment",
      amount: usd(a.amount!),
      detail: parts.join(" · "),
      kept: usd(a.kept!),
      repaid: usd(a.repaid!),
    });
  }
  for (const l of advanced) items.push({ ...base(l), kind: "advance", amount: usd(l.args.amount!) });
  for (const l of requested) items.push({ ...base(l), kind: "withdraw-requested", amount: usd(l.args.amount!) });
  for (const l of cancelled) items.push({ ...base(l), kind: "withdraw-cancelled", amount: usd(l.args.amount!) });
  for (const l of withdrawn) items.push({ ...base(l), kind: "withdrawn", amount: usd(l.args.amount!) });
  for (const l of repaid) {
    const fee = usd(l.args.fee!);
    items.push({
      ...base(l),
      kind: "repaid",
      amount: usd(l.args.principal!) + fee,
      detail: fee > 0 ? `includes $${fee.toFixed(2)} fee` : "no fee",
    });
  }
  for (const l of settled) items.push({ ...base(l), kind: "settled", amount: usd(l.args.owed!) });
  for (const l of into) {
    if (own.has(l.args.from!.toLowerCase())) continue;
    items.push({ ...base(l), kind: "received", amount: usd(l.args.value!), detail: "straight to your wallet" });
  }
  for (const l of out) {
    if (own.has(l.args.to!.toLowerCase())) continue;
    const to = l.args.to!;
    items.push({ ...base(l), kind: "sent", amount: usd(l.args.value!), detail: `to ${to.slice(0, 6)}…${to.slice(-4)}`, to });
  }

  // One timestamp lookup per block, not per event.
  const blocks = [...new Set(items.map((i) => i.block))];
  const times = new Map(
    await Promise.all(blocks.map(async (b) => [b, Number((await logs.getBlock({ blockNumber: b })).timestamp) * 1000] as const))
  );
  return items
    .map(({ block, ...i }) => ({ ...i, at: times.get(block) ?? 0 }))
    .sort((a, b) => b.at - a.at || b.id.localeCompare(a.id));
}
