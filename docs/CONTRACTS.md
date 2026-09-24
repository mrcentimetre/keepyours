# Contracts

`KeepVault.sol` — one contract, one entry per user. Not upgradeable. No admin withdraw.

## State

```solidity
struct Vault {
    address spendTo;    // where the spend share and advances go
    address safePlace;  // the only destination for saved funds
    address guardian;   // optional; can only speed up a release
    uint16  keepBps;    // 0..10000, e.g. 4000 = 40% kept
    uint32  cooldown;   // seconds, 1 day .. 30 days
    uint256 saved;      // USDC held for this user
    uint256 owed;       // open advance + fee
}

struct Pending {          // at most one withdrawal request per user
    uint256 amount;
    uint64  releaseAt;
}

struct PendingSettings {  // settings changes that weaken protection
    Vault   next;
    uint64  applyAt;
}
```

## Functions

| Function | Who | What it does |
|---|---|---|
| `open(Vault cfg)` | anyone | Creates a vault for `msg.sender`. |
| `deposit(address owner, uint256 amt)` | anyone | Pulls USDC, repays `owed` first, sends the spend share to `spendTo`, adds the rest to `saved`. |
| `advance(uint256 amt)` | owner | Requires `amt + fee <= saved / 2 - owed`. Sends `amt` to `spendTo`, adds `amt + fee` to `owed`. |
| `requestWithdraw(uint256 amt)` | owner | Requires `amt <= saved - owed`. Sets `releaseAt = now + cooldown`. |
| `cancelWithdraw()` | owner | Clears the pending request. |
| `executeWithdraw()` | owner | After `releaseAt`, sends the amount **to `safePlace`**. |
| `guardianApprove(address owner)` | guardian | Sets `releaseAt = now` for an existing request. Nothing else. |
| `proposeSettings(Vault next)` | owner | Stronger settings apply at once; weaker ones wait `cooldown`. |
| `applySettings()` | owner | Applies a pending settings change once `applyAt` has passed. |
| `settleExpired(address owner)` | anyone | After 60 days with `owed > 0`, deducts `owed` from `saved`. |

**Stronger vs weaker settings.** Stronger = longer cooldown, or adding a guardian. Weaker = shorter cooldown, changing `safePlace` or `spendTo`, or removing a guardian. Weaker changes wait, which is what protects a user whose keys were stolen.

## Events

```solidity
event Opened(address indexed owner, uint16 keepBps, uint32 cooldown);
event Deposited(address indexed owner, uint256 amount, uint256 repaid, uint256 spent, uint256 kept);
event Advanced(address indexed owner, uint256 amount, uint256 fee);
event WithdrawRequested(address indexed owner, uint256 amount, uint64 releaseAt);
event WithdrawCancelled(address indexed owner, uint256 amount);
event Withdrawn(address indexed owner, uint256 amount, address to);
event GuardianApproved(address indexed owner, address indexed guardian);
event SettingsProposed(address indexed owner, uint64 applyAt);
event SettingsApplied(address indexed owner);
event Settled(address indexed owner, uint256 owed);
```

The app and the Telegram bot are driven entirely by these events. No extra backend state.

## Invariants (these are the tests)

1. **Saved funds only ever leave to `safePlace`,** or to repay `owed` inside the contract.
2. **`owed <= saved / 2`** at all times.
3. **Withdrawable = `saved - owed`.** An advance can never be stranded by a withdrawal.
4. **`releaseAt >= requestedAt + cooldown`**, unless the guardian approved.
5. **A weaker setting never takes effect before the current cooldown has passed.**
6. **The guardian can never be paid** and can never move funds.
7. **No admin path.** There is no owner, pause or sweep function that can move user funds.
8. **Sum of all `saved` + fees held = the contract's USDC balance.** No user can spend another user's balance.

## Deliberate limits during the hackathon

- **Deposit cap** per vault (e.g. $200) enforced in `deposit`, removable only by deploying a new version.
- **USDC only.** USDT support is a decision still open (see the research notes).
- **Not upgradeable.** A bug means a new deployment and a migration, which is safer than a proxy we haven't reviewed.

## Fee model

- Advance fee: flat `advanceFeeBps` (150 = 1.5%), set at deploy, capped in code at 300 (3%).
- Yield share (later): 15% of interest earned, taken when savings are withdrawn.
- Fees accrue to a `feeSink` address. The contract never takes from `saved` except for `owed` and fees already charged.
