# Contracts

Three contracts. Not upgradeable. No admin path to user funds.

| Contract | Instances | Job |
|---|---|---|
| `KeepVault` | **One per user**, an EIP-1167 clone of one fixed implementation | Holds that user's savings. Split, waiting period, guardian, advance requests. |
| `KeepVaultFactory` | One | Creates a user's vault at a predictable address and keeps the list of genuine vaults. |
| `AdvancePool` | One | Separate money, seeded by the builder, that funds advances. **Never holds user savings.** |

**Why one vault per user** (decided 26 Sep 2026, after mentor feedback): each person's savings sit at their own address, so there is no shared pool for a bug to drain, the non-custodial claim is checkable on Arbiscan, and per-vault accounting is simple to test. Clones are proxies, but of fixed code: the implementation is immutable and there is no upgrade path.

## KeepVault

```solidity
// set once in initialize()
address owner;      // the user's smart account
address spendTo;    // where the spend share and advances go
address safePlace;  // the only destination for saved funds
address guardian;   // optional; can only speed up a release
uint16  keepBps;    // 0..10000, e.g. 4000 = 40% kept
uint32  cooldown;   // seconds, 1 day .. 30 days
address pool;       // the AdvancePool, passed in by the factory

uint256 saved;      // USDC that has been through process() and kept

struct Pending { uint256 amount; uint64 requestedAt; uint64 releaseAt; }  // at most one
struct PendingSettings { Config next; uint64 applyAt; }     // weaker changes wait
```

The implementation holds the shared constants as immutables: the USDC address, the deposit cap and the minimum cooldown (1 day on mainnet, minutes on testnet so the flow can be tried quickly). The maximum cooldown is 30 days.

The vault's USDC balance is `saved` plus any **unprocessed** USDC (arrived, not yet split). What is owed on an advance lives in the pool, the single source of truth; the vault reads it.

## Functions

**KeepVaultFactory**

| Function | Who | What it does |
|---|---|---|
| `createVault(Config cfg)` | the future owner only | Deploys the user's clone with CREATE2 (salt = owner), calls `initialize` in the same transaction, registers it. One per owner. |
| `predictVault(address owner)` | anyone | The vault address, before it exists. The get-paid link points here. |
| `vaultOf(owner)`, `isVault(addr)` | anyone | Registry. The pool relies on `isVault`. |

**KeepVault**

| Function | Who | What it does |
|---|---|---|
| `process()` | anyone | Splits USDC that has arrived: repay any advance first (to the pool), then send the spend share to `spendTo`, then add the rest to `saved`. Anything that would push `saved` above the cap goes to spend instead. |
| `advance(uint256 amt)` | owner | Asks the pool to lend `amt` to `spendTo`. One open advance at a time. Requires `amt * 1.03 <= (saved - pending withdrawal) / 2`, so an advance can't take collateral already promised to a withdrawal. |
| `requestWithdraw(uint256 amt)` | owner | Requires `amt <= saved - owedMax`. Sets `releaseAt = now + cooldown`. A second request while one is pending reverts; cancel first. |
| `cancelWithdraw()` | owner | Clears the pending request. |
| `executeWithdraw()` | owner | After `releaseAt`, sends the amount **to `safePlace`**. Re-checks `saved - amt >= owedMax`. |
| `guardianApprove()` | guardian | Sets `releaseAt = now` for an existing request. Nothing else. |
| `proposeSettings(Config next)` / `applySettings()` | owner | Stronger settings apply at once; weaker ones wait `cooldown`. A new proposal replaces a pending one, so re-proposing the current settings cancels it. |
| `releaseToPool(uint256 amt)` | **the pool only** | After day 90 of an advance, sends at most what is owed to the pool. |

**Stronger vs weaker settings.** Stronger = longer cooldown, or adding a guardian. Weaker = shorter cooldown, changing `safePlace` or `spendTo`, removing or swapping a guardian, or lowering `keepBps`. The guardian can never be `spendTo` or `safePlace`. Weaker changes wait, which is what protects a user whose keys were stolen.

**AdvancePool**

| Function | Who | What it does |
|---|---|---|
| `fund(amt)` / `withdrawUnlent(amt)` | pool owner | Adds or removes the builder's own unlent capital. Cannot touch any vault. |
| `setFactory(addr)` | deployer, **once** | Breaks the deploy-order cycle, then is locked. |
| `lend(spendTo, amt)` | a genuine vault | Checks `factory.isVault(msg.sender)`, reads the vault's `saved`, sends `amt` to `spendTo`, records principal and start time. |
| `repay(amt)` | a genuine vault | Pulls `amt` from the vault (the vault approves it first) and records it: fee first, then principal. The fee goes to `feeSink`. |
| `settle(address vault)` | anyone | After day 90, calls `vault.releaseToPool(owed)`. |
| `owedNow(vault)`, `owedMax(vault)` | anyone | Views. `owedMax` = principal + the 3% cap, used to reserve collateral. |

## Advance fee schedule

| Days since the advance | Fee on the principal |
|---|---|
| 0 to 30 | **0%** |
| 31 to 60 | 1.5% |
| 61 to 90 | 3% |
| after 90 | anyone can `settle`: the pool takes what is owed from the user's savings |

- The fee is set by the day the repayment lands, worked out at that moment. No compounding, no accrual to track.
- Capped at 3% in code. There is **no penalty** in the MVP.
- Repayment comes first from the next deposits, before the split.

## Deposits

The payer sends USDC straight to the vault address, which is known before the vault exists. A plain ERC-20 transfer can't run code, so nothing splits until someone calls `process()`. The app calls it when it sees a deposit, and a small keeper is the backup. Anyone can call it, so a dead keeper never traps funds.

The cap applies to `saved` at `process()` time, because a transfer can't be rejected.

## Events

```solidity
event VaultCreated(address indexed owner, address vault, uint16 keepBps, uint32 cooldown);
event Processed(address indexed vault, uint256 amount, uint256 repaid, uint256 spent, uint256 kept);
event Advanced(address indexed vault, uint256 amount);
event AdvanceRepaid(address indexed vault, uint256 principal, uint256 fee);
event Settled(address indexed vault, uint256 owed);
event WithdrawRequested(address indexed vault, uint256 amount, uint64 releaseAt);
event WithdrawCancelled(address indexed vault, uint256 amount);
event Withdrawn(address indexed vault, uint256 amount, address to);
event GuardianApproved(address indexed vault, address indexed guardian);
event SettingsProposed(address indexed vault, uint64 applyAt);
event SettingsApplied(address indexed vault);
event ReleasedToPool(address indexed vault, uint256 amount);
```

The app and the Telegram bot are driven entirely by these events. No extra backend state.

## Invariants (these are the tests)

1. **Savings leave a vault only to its `safePlace`,** or to the pool to repay what is owed (through `process()`, or `settle` after day 90).
2. **The 50% cap applies when an advance is taken:** `principal * 1.03 <= saved / 2`.
3. **An open advance is always covered:** `saved >= owedMax` at all times. *(This replaces the old "`owed <= saved / 2` at all times", which contradicted invariant 4.)*
4. **Withdrawable = `saved - owedMax`.** An advance can never be stranded by a withdrawal.
5. **`releaseAt >= requestedAt + cooldown`**, unless the guardian approved.
6. **A weaker setting never takes effect before the current cooldown has passed.**
7. **The guardian can never be paid** and can never move funds.
8. **No admin path.** No owner, pause or sweep function on a vault or the factory can move user funds. The pool owner can only move unlent pool liquidity, never vault money.
9. **Segregation.** A vault's USDC balance is never below its `saved`, and nothing another user or vault does can lower it. The pool's balance plus outstanding principal never falls below what was funded minus what was withdrawn.
10. **Only genuine vaults.** A vault can only be created by its owner, once per owner, at the predicted address. `initialize` runs once, and the implementation itself cannot be initialised. The pool lends only to addresses the factory created.
11. **One advance at a time, and the fee never exceeds 3%.**

## Deliberate limits during the hackathon

- **Deposit cap** on `saved` (e.g. $200), enforced in `process()`, removable only by deploying a new factory.
- **USDC only.** USDT support is a decision still open (see the research notes).
- **Not upgradeable.** A bug means a new implementation and factory and a migration, which is safer than a proxy we haven't reviewed. Note that a bug in the shared implementation is a bug in every vault.
- **The advance pool is small and the builder's own money.** On testnet it is test USDC. On mainnet it is a few tens of dollars, and it can be lost. Where the capital comes from at scale is an open question (the Club raised it).

## Deploy order

1. `AdvancePool` (with `feeSink`).
2. `KeepVault` implementation (USDC, cap).
3. `KeepVaultFactory` (implementation, pool).
4. `pool.setFactory(factory)`, once.

## Fees and money flow

- Advance fee: the schedule above, in `advanceFeeBps` tiers set at deploy, capped at 300.
- Yield share (later): 15% of interest earned, taken when savings are withdrawn.
- Fees go to `feeSink`. Contract code never takes from `saved` except what is owed.

## Decided against, for now

- **Early-release penalty:** out of the MVP (26 Sep 2026). If added later it must be a fixed, capped fee in code and in the user agreement, never discretionary, and invariant 1 must be updated to allow it.
- **Score-based limits** (Nomis, Ethos, social proof): later. They would only raise the limit above 50%, which means lending against less than the full amount.
- **Coinbase or any custodial platform for yield:** no. It contradicts non-custodial. Aave v3 USDC on Arbitrum stays the plan for later, opt-in and capped.
