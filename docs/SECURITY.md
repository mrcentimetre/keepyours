# Security

**Status: unaudited.** This code has not been reviewed by a third party. Deposits are capped per vault during the hackathon. Don't deposit money you can't afford to lose.

## Design principles

1. **Non-custodial.** No admin key can move user funds. There is no pause that traps money, and no sweep except into the user's own vault.
2. **Small surface.** One contract, no proxy, no upgrade path, no external calls except USDC transfers (and Aave later, opt-in).
3. **Slow is safe.** Anything that weakens protection (shorter cooldown, new safe address, removing a guardian) waits out the current cooldown.
4. **Fail toward the user.** If the keeper dies, the user can sweep. If the frontend dies, the contract still works from a block explorer.

## Threat model

| Threat | What could happen | Mitigation | Residual |
|---|---|---|---|
| User's key stolen | Attacker drains the vault | Saved funds only go to `safePlace`; changing it waits the full cooldown; alerts fire on request | Low. The spend wallet is still exposed. |
| Key stolen, attacker uses `advance` | Up to 50% pulled instantly | Advances pay out to `spendTo`, which itself takes a cooldown to change; alert on every advance; optional guardian approval above a threshold | Medium |
| Malicious guardian | Releases funds the user didn't want | Guardian can only speed up a release the owner requested, to the owner's own `safePlace`; can never receive funds or change settings | Low |
| Advance accounting bug | `owed > saved`, or collateral withdrawn | Invariants 2 and 3 tested with fuzz + invariant tests; flat fee, no interest accrual | Medium |
| Reentrancy / ERC-20 quirks | Funds drained or stuck | `SafeERC20`, `ReentrancyGuard`, checks-effects-interactions, USDC only (no fee-on-transfer or rebasing tokens) | Medium |
| Rounding | Dust lost or created | `keepBps` maths rounds in the user's favour (keep the remainder); invariant 8 checks total balance | Low |
| Keeper key leaked | Attacker calls `sweep()` | `sweep()` can only move funds from the forwarder into the vault. Nothing else is permissioned. | Low |
| Frontend compromised | Users tricked into bad settings | Settings changes that weaken protection are delayed and alerted; contract address published on the site, X and Arbiscan | Medium |
| Fake site / phishing | Deposits to an attacker | Publish the verified contract address everywhere; in-app "verified contract" badge | Medium |
| USDC freeze | Circle blacklists an address | Documented, not mitigable. Multi-token support later spreads the risk. | Medium |
| Aave risk (later) | Yield protocol loss | Opt-in only, rate and risk shown, cap the share of each vault | Deferred |
| User locks themselves out | Can't reach money in an emergency | Cooldown is capped at 30 days and is always cancellable; guardian path; advance covers urgent cash | Low |

## Practices

- Foundry unit, fuzz and invariant tests; see [`TESTING.md`](TESTING.md).
- Slither static analysis before each deployment.
- Contracts verified on Arbiscan; addresses in the README.
- Deposit cap enforced in the contract, not just the UI.
- No secrets in the repo; `.env.example` lists every key by name only.

## Reporting a problem

Open a GitHub issue, or DM the project account on X. If it's a live vulnerability, please don't post details publicly first.

## Before removing the cap

External audit, a bug bounty, and a written incident plan. Not before.
