# Testing

The invariants in [`CONTRACTS.md`](CONTRACTS.md) are the specification. Every one of them has a test.

## Layers

| Layer | Tool | What it covers |
|---|---|---|
| Unit | Foundry `forge test` | Each function's happy path and each revert |
| Fuzz | Foundry fuzzing | Split maths, advance limits, rounding |
| Invariant | Foundry invariant tests | The 8 invariants, across random sequences of calls |
| Static | Slither | Reentrancy, unchecked returns, shadowing |
| Manual | Testnet run-through | The full user journey on Arbitrum Sepolia |

## Unit tests to write

**Deposit and split**
- Deposit with no advance: spend share goes to `spendTo`, rest to `saved`.
- Deposit with an open advance: `owed` is repaid first, then the split applies to the remainder.
- Deposit smaller than `owed`: all of it repays, nothing splits.
- `keepBps = 0` and `keepBps = 10000` both behave.
- Deposit above the cap reverts.

**Advance**
- Advance at exactly 50% of `saved` succeeds; one wei more reverts.
- A second advance is limited by the first one's `owed`.
- Fee is charged once, at the set rate, and never above the 3% cap.
- `settleExpired` before 60 days reverts; after 60 days it deducts `owed`.

**Withdrawals**
- `requestWithdraw` above `saved - owed` reverts.
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

Run random sequences of `deposit`, `advance`, `requestWithdraw`, `cancelWithdraw`, `executeWithdraw` and `settleExpired` across several actors, asserting after every step:

1. `owed <= saved / 2`
2. `withdrawable == saved - owed`
3. Contract USDC balance == sum of all `saved` + fees held
4. No transfer ever left to an address other than `spendTo`, `safePlace` or `feeSink`
5. `releaseAt - requestedAt >= cooldown` unless a guardian approved

## Manual test on Arbitrum Sepolia

1. Create a vault with 60/40 and a 5-minute cooldown (short, for testing).
2. Send test USDC from a second wallet; check the split and the event.
3. Take an advance; check `spendTo` receives it and `owed` increases.
4. Send another payment; check repayment comes first.
5. Request a withdrawal; check the countdown and the Telegram alert.
6. Cancel; check the balance.
7. Request again, wait it out, execute; check it lands in `safePlace`.
8. Try to execute early. Try to withdraw more than `saved - owed`. Both should fail clearly in the UI.

## Before mainnet

- All unit, fuzz and invariant tests green.
- Slither clean, or every finding explained in a comment.
- Deposit cap set.
- Deploy, verify on Arbiscan, then run the manual list again with $5.
