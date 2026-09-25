# Testing

The invariants in [`CONTRACTS.md`](CONTRACTS.md) are the specification. Every one of them has a test.

## Layers

| Layer | Tool | What it covers |
|---|---|---|
| Unit | Foundry `forge test` | Each function's happy path and each revert |
| Fuzz | Foundry fuzzing | Split maths, advance limits, fee tiers, rounding |
| Invariant | Foundry invariant tests | The 11 invariants, across random sequences of calls |
| Static | Slither | Reentrancy, unchecked returns, shadowing |
| Manual | Testnet run-through | The full user journey on Arbitrum Sepolia |

## Unit tests to write

**Factory and clones**
- `createVault` from anyone other than the owner reverts.
- A second `createVault` for the same owner reverts.
- The vault lands at `predictVault(owner)`, and USDC sent there **before** it exists is still there afterwards.
- `initialize` cannot be called twice, and cannot be called on the implementation itself.
- `isVault` is true only for vaults the factory made.

**Process and split**
- Deposit with no advance: spend share goes to `spendTo`, rest to `saved`.
- Deposit with an open advance: the advance is repaid first, then the split applies to the remainder.
- Deposit smaller than what is owed: all of it repays, nothing splits.
- `keepBps = 0` and `keepBps = 10000` both behave.
- Anything that would push `saved` above the cap goes to spend.
- Anyone can call `process()`, and the result is the same whoever does.

**Advance and pool**
- Advance at exactly the 50% limit succeeds; one wei more reverts.
- A second advance while one is open reverts.
- A caller that is not a genuine vault cannot `lend` (a hand-made fake vault is refused).
- Fee is 0% until day 30, 1.5% on days 31 to 60, 3% on days 61 to 90, and never above 3% (use `vm.warp` at each boundary).
- `settle` before day 90 reverts; after day 90 it takes what is owed from `saved` and refills the pool.
- `releaseToPool` from anyone other than the pool reverts, and cannot take more than is owed.
- The pool owner can withdraw unlent liquidity and cannot touch any vault.
- `setFactory` works once and then reverts.

**Withdrawals**
- `requestWithdraw` above `saved - owedMax` reverts.
- `executeWithdraw` before `releaseAt` reverts.
- `executeWithdraw` sends to `safePlace`, never to `msg.sender` if they differ.
- `cancelWithdraw` restores the full balance and clears the request.
- A second `requestWithdraw` while one is pending replaces or reverts (decide and test).

**Settings**
- A longer cooldown applies immediately.
- A shorter cooldown waits out the current cooldown.
- Changing `safePlace` waits.
- `applySettings` before `applyAt` reverts.

**Guardian**
- Guardian can only release an existing request.
- Guardian cannot change settings, withdraw, or set themselves as `safePlace`.
- A non-guardian calling `guardianApprove` reverts.

## Invariant tests

Run random sequences of deposits, `process`, `advance`, `requestWithdraw`, `cancelWithdraw`, `executeWithdraw`, time jumps and `settle` across several actors and several vaults, asserting after every step:

1. An open advance is always covered: `saved >= owedMax`.
2. `withdrawable == saved - owedMax`.
3. Every vault's USDC balance is at least its `saved`, and one user's actions never lower another vault's balance.
4. Pool balance plus outstanding principal never falls below funded minus withdrawn.
5. No transfer ever left a vault to an address other than `spendTo`, `safePlace`, the pool or `feeSink`.
6. `releaseAt - requestedAt >= cooldown` unless a guardian approved.
7. The fee charged is never above 3% of the principal.

## Manual test on Arbitrum Sepolia

1. Create a vault through the factory with 60/40 and a 5-minute cooldown (short, for testing).
2. Send test USDC from a second wallet **to the vault address**; call `process()`; check the split and the event.
3. Take an advance; check `spendTo` receives it from the pool and the debt appears.
4. Send another payment and call `process()`; check repayment comes first.
5. Request a withdrawal; check the countdown and the Telegram alert.
6. Cancel; check the balance.
7. Request again, wait it out, execute; check it lands in `safePlace`.
8. Try to execute early. Try to withdraw more than `saved - owedMax`. Both should fail clearly in the UI.
9. Try to borrow from the pool with a wallet that is not a vault. It should be refused.

## Before mainnet

- All unit, fuzz and invariant tests green.
- Slither clean, or every finding explained in a comment.
- Deposit cap set, and the advance pool funded with a small amount only.
- Deploy in the order in `CONTRACTS.md`, verify on Arbiscan, then run the manual list again with $5.
