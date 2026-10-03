// Keep Yours keeper (T5.2). Runs on the VPS, next to nothing else.
//
// Every TICK_MS it:
//   1. finds every vault the factory has made,
//   2. calls process() on any vault holding unsplit USDC (anyone may),
//   3. calls settle() on any advance past its third fee period (anyone may),
//   4. sends a web push for every new on-chain event on a vault that has a
//      registered phone, so notifications arrive with the app closed.
// It also runs a tiny HTTP server that /api/push (on Vercel) uses to register
// phones. State is one JSON file. The key only pays gas: it can't move savings.

import { createServer } from "node:http";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { createPublicClient, createWalletClient, formatUnits, http, parseAbi, parseAbiItem } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import webpush from "web-push";

const env = (k, fallback) => {
  const v = process.env[k] ?? fallback;
  if (v === undefined) throw new Error(`Missing ${k} in keeper/.env`);
  return v;
};

const RPC = env("RPC_URL", "https://sepolia-rollup.arbitrum.io/rpc");
const FACTORY = env("FACTORY");
const POOL = env("POOL");
const USDC = env("USDC");
const DEPLOY_BLOCK = BigInt(env("DEPLOY_BLOCK", "314160190"));
const SECRET = env("KEEPER_SECRET");
const PORT = Number(env("PORT", "8787"));
const TICK_MS = Number(env("TICK_MS", "15000"));
const STATE_FILE = env("STATE_FILE", "./data/state.json");
const rawKey = env("KEEPER_PRIVATE_KEY");
const account = privateKeyToAccount(rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`);

webpush.setVapidDetails(env("VAPID_SUBJECT", "mailto:hello@keepyours.xyz"), env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY"));

const chain = arbitrumSepolia;
const pub = createPublicClient({ chain, transport: http(RPC) });
const wallet = createWalletClient({ chain, transport: http(RPC), account });

const log = (...a) => console.log(new Date().toISOString(), ...a);

// ── state ───────────────────────────────────────────────────────

/** { lastBlock, vaults: { [vault]: owner }, subs: { [vault]: Subscription[] } } (addresses lowercase) */
let state = { lastBlock: null, vaults: {}, subs: {} };
try {
  state = { ...state, ...JSON.parse(readFileSync(STATE_FILE, "utf8")) };
} catch {
  log("no state yet, starting fresh");
}

function save() {
  mkdirSync(STATE_FILE.replace(/\/[^/]+$/, ""), { recursive: true });
  const tmp = `${STATE_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2));
  renameSync(tmp, STATE_FILE); // atomic: a crash mid-write never corrupts the file
}

// ── chain ───────────────────────────────────────────────────────

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
  settingsProposed: parseAbiItem("event SettingsProposed(address indexed vault, uint64 applyAt)"),
  settingsApplied: parseAbiItem("event SettingsApplied(address indexed vault)"),
};
const vaultAbi = parseAbi(["function process()", "function unprocessed() view returns (uint256)"]);
const poolAbi = parseAbi([
  "function settle(address vault)",
  "function loans(address vault) view returns (uint128 principal, uint64 start)",
  "function period() view returns (uint32)",
]);

const usd = (raw) => Number(formatUnits(raw, 6));
const $ = (n) => `$${n.toFixed(2)}`;

let period = null;

async function discoverVaults(from, to) {
  const logs = await pub.getLogs({ address: FACTORY, event: ev.created, fromBlock: from, toBlock: to });
  for (const l of logs) state.vaults[l.args.vault.toLowerCase()] = l.args.owner.toLowerCase();
  if (logs.length) log(`found ${logs.length} new vault(s)`);
}

/** process() and settle() wherever they're due. One tx at a time keeps nonces simple. */
async function upkeep() {
  const vaults = Object.keys(state.vaults);
  if (!vaults.length) return;
  period ??= Number(await pub.readContract({ address: POOL, abi: poolAbi, functionName: "period" }));
  const reads = await pub.multicall({
    allowFailure: true,
    contracts: vaults.flatMap((v) => [
      { address: v, abi: vaultAbi, functionName: "unprocessed" },
      { address: POOL, abi: poolAbi, functionName: "loans", args: [v] },
    ]),
  });
  const now = Math.floor(Date.now() / 1000);
  for (let i = 0; i < vaults.length; i++) {
    const v = vaults[i];
    const unprocessed = reads[2 * i];
    const loan = reads[2 * i + 1];
    try {
      if (unprocessed.status === "success" && unprocessed.result > 0n) {
        const hash = await wallet.writeContract({ address: v, abi: vaultAbi, functionName: "process" });
        await pub.waitForTransactionReceipt({ hash });
        log(`split ${$(usd(unprocessed.result))} for ${v}`);
      }
      if (loan.status === "success") {
        const [principal, start] = loan.result;
        if (principal > 0n && now > Number(start) + 3 * period) {
          const hash = await wallet.writeContract({ address: POOL, abi: poolAbi, functionName: "settle", args: [v] });
          await pub.waitForTransactionReceipt({ hash });
          log(`settled overdue advance for ${v}`);
        }
      }
    } catch (e) {
      // Usually a race with the app's own splitter: someone else did it first.
      log(`upkeep skipped for ${v}: ${(e.shortMessage ?? e.message).split("\n")[0]}`);
    }
  }
}

// ── notifications ───────────────────────────────────────────────

// Same wording as notificationText() in lib/activity.ts; keep the two in step.
function text(kind, a) {
  switch (kind) {
    case "payment":
      return { title: `${$(a.amount)} received`, body: `${$(a.kept)} kept · ${$(a.spent)} to spend` };
    case "received":
      return { title: `${$(a.amount)} received in your wallet`, body: "Sent straight to your wallet, so it wasn't split." };
    case "sent":
      return { title: `${$(a.amount)} sent`, body: "Sent from your wallet." };
    case "advance":
      return { title: `${$(a.amount)} advance taken`, body: "It's in your wallet. Your next payment repays it first." };
    case "repaid":
      return { title: `Advance repaid · ${$(a.amount)}`, body: a.fee > 0 ? `Includes ${$(a.fee)} fee.` : "No fee." };
    case "settled":
      return { title: `Advance settled · ${$(a.amount)}`, body: "Taken from your savings after day 90." };
    case "withdraw-requested":
      return { title: `Withdrawal of ${$(a.amount)} started`, body: "If this wasn't you, open Keep Yours and cancel it." };
    case "withdraw-cancelled":
      return { title: `Withdrawal of ${$(a.amount)} cancelled`, body: "Your savings stay put." };
    case "withdrawn":
      return { title: `${$(a.amount)} withdrawn`, body: "It's in your wallet now." };
    case "settings-requested":
      return { title: "Settings change requested", body: "It applies after your waiting period. If this wasn't you, open Keep Yours and cancel it." };
    case "settings-applied":
      return { title: "Vault settings updated", body: "Your new split and waiting period are in force." };
  }
}

/** New events on vaults that have a registered phone, oldest first. */
async function newEvents(from, to) {
  const watched = Object.keys(state.subs).filter((v) => state.subs[v]?.length && state.vaults[v]);
  if (!watched.length) return [];
  const owners = watched.map((v) => state.vaults[v]);
  const range = { fromBlock: from, toBlock: to };
  const [processed, advanced, requested, cancelled, withdrawn, repaid, settled, into, out, proposedS, appliedS] = await Promise.all([
    pub.getLogs({ ...range, address: watched, event: ev.processed }),
    pub.getLogs({ ...range, address: watched, event: ev.advanced }),
    pub.getLogs({ ...range, address: watched, event: ev.requested }),
    pub.getLogs({ ...range, address: watched, event: ev.cancelled }),
    pub.getLogs({ ...range, address: watched, event: ev.withdrawn }),
    pub.getLogs({ ...range, address: POOL, event: ev.repaid, args: { vault: watched } }),
    pub.getLogs({ ...range, address: POOL, event: ev.settled, args: { vault: watched } }),
    pub.getLogs({ ...range, address: USDC, event: ev.transfer, args: { to: owners } }),
    pub.getLogs({ ...range, address: USDC, event: ev.transfer, args: { from: owners } }),
    pub.getLogs({ ...range, address: watched, event: ev.settingsProposed }),
    pub.getLogs({ ...range, address: watched, event: ev.settingsApplied }),
  ]);
  const ownerToVault = Object.fromEntries(watched.map((v) => [state.vaults[v], v]));
  const own = new Set([...watched, POOL.toLowerCase()]);
  const items = [];
  const at = (l) => ({ id: `${l.transactionHash}-${l.logIndex}`, block: l.blockNumber, index: l.logIndex });
  const vaultOf = (l) => (l.args.vault ?? l.address).toLowerCase();

  for (const l of processed)
    items.push({ ...at(l), vault: vaultOf(l), kind: "payment", a: { amount: usd(l.args.amount), kept: usd(l.args.kept), spent: usd(l.args.spent) } });
  for (const l of advanced) items.push({ ...at(l), vault: vaultOf(l), kind: "advance", a: { amount: usd(l.args.amount) } });
  for (const l of requested) items.push({ ...at(l), vault: vaultOf(l), kind: "withdraw-requested", a: { amount: usd(l.args.amount) } });
  for (const l of cancelled) items.push({ ...at(l), vault: vaultOf(l), kind: "withdraw-cancelled", a: { amount: usd(l.args.amount) } });
  for (const l of withdrawn) items.push({ ...at(l), vault: vaultOf(l), kind: "withdrawn", a: { amount: usd(l.args.amount) } });
  for (const l of repaid)
    items.push({ ...at(l), vault: vaultOf(l), kind: "repaid", a: { amount: usd(l.args.principal + l.args.fee), fee: usd(l.args.fee) } });
  for (const l of settled) items.push({ ...at(l), vault: vaultOf(l), kind: "settled", a: { amount: usd(l.args.owed) } });
  for (const l of proposedS) items.push({ ...at(l), vault: vaultOf(l), kind: "settings-requested", a: {} });
  for (const l of appliedS) items.push({ ...at(l), vault: vaultOf(l), kind: "settings-applied", a: {} });
  // Wallet transfers the vault or pool already explain would show twice.
  for (const l of into) {
    if (own.has(l.args.from.toLowerCase())) continue;
    items.push({ ...at(l), vault: ownerToVault[l.args.to.toLowerCase()], kind: "received", a: { amount: usd(l.args.value) } });
  }
  for (const l of out) {
    if (own.has(l.args.to.toLowerCase())) continue;
    items.push({ ...at(l), vault: ownerToVault[l.args.from.toLowerCase()], kind: "sent", a: { amount: usd(l.args.value) } });
  }
  return items.filter((i) => i.vault).sort((x, y) => (x.block === y.block ? x.index - y.index : Number(x.block - y.block)));
}

async function push(item) {
  const subs = state.subs[item.vault] ?? [];
  const payload = JSON.stringify({ ...text(item.kind, item.a), tag: item.id, url: "/app/home" });
  const keep = [];
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, payload, { TTL: 24 * 3600 });
      keep.push(sub);
    } catch (e) {
      // 404/410: the phone unsubscribed or the app was deleted. Drop it.
      if (e.statusCode === 404 || e.statusCode === 410) log(`dropped a dead subscription for ${item.vault}`);
      else {
        keep.push(sub);
        log(`push failed (${e.statusCode ?? "?"}) for ${item.vault}`);
      }
    }
  }
  state.subs[item.vault] = keep;
}

// ── loop ────────────────────────────────────────────────────────

let running = false;
async function tick() {
  if (running) return;
  running = true;
  try {
    const latest = await pub.getBlockNumber();
    // First run: start notifying from now, never replay history.
    const from = state.lastBlock === null ? DEPLOY_BLOCK : BigInt(state.lastBlock) + 1n;
    if (from <= latest) {
      await discoverVaults(from, latest);
      if (state.lastBlock !== null) {
        for (const item of await newEvents(from, latest)) await push(item);
      }
      state.lastBlock = latest.toString();
      save();
    }
    await upkeep();
  } catch (e) {
    log("tick failed:", (e.shortMessage ?? e.message).split("\n")[0]);
  } finally {
    running = false;
  }
}

// ── HTTP: phones register through /api/push on Vercel ───────────

const MAX_SUBS_PER_VAULT = 5;

createServer((req, res) => {
  const reply = (code, body) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (req.method === "GET" && req.url === "/health") return reply(200, { ok: true, vaults: Object.keys(state.vaults).length });
  if (req.method !== "POST" || req.url !== "/subscribe") return reply(404, { error: "not found" });
  if (req.headers["x-keeper-secret"] !== SECRET) return reply(401, { error: "unauthorised" });

  let body = "";
  req.on("data", (c) => {
    body += c;
    if (body.length > 10_000) req.destroy();
  });
  req.on("end", () => {
    try {
      const { vault, subscription } = JSON.parse(body);
      if (!/^0x[0-9a-fA-F]{40}$/.test(vault) || !subscription?.endpoint?.startsWith("https://")) {
        return reply(400, { error: "bad request" });
      }
      const v = vault.toLowerCase();
      const others = (state.subs[v] ?? []).filter((s) => s.endpoint !== subscription.endpoint);
      state.subs[v] = [...others, subscription].slice(-MAX_SUBS_PER_VAULT);
      save();
      log(`registered a phone for ${v}`);
      reply(200, { ok: true });
    } catch {
      reply(400, { error: "bad json" });
    }
  });
}).listen(PORT, () => log(`keeper listening on :${PORT} as ${account.address}`));

tick();
setInterval(tick, TICK_MS);
