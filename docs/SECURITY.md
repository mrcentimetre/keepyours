# Security

**Status: unaudited.** This code has not been reviewed by a third party. Deposits are capped per vault during the hackathon. Don't deposit money you can't afford to lose.

**Security is priority one.** When it conflicts with a feature, the feature waits.

## Design principles

1. **Non-custodial.** No admin key can move user funds. Each user's savings sit in **their own vault contract**, with no shared pool. There is no pause that traps money, and no sweep function.
2. **Small surface.** Three contracts, no upgrade path (the vaults are immutable clones of one fixed implementation), no external calls except USDC transfers (and Aave later, opt-in).
3. **Slow is safe.** Anything that weakens protection (shorter cooldown, new safe address, removing a guardian) waits out the current cooldown.
4. **Fail toward the user.** If the keeper dies, anyone can call `process()`. If the frontend dies, the vault still works and the code is open, so any app can use it. For passkey users this needs the planned standalone emergency page, because a passkey account cannot sign from a block explorer.
5. **Advances never spend other people's money.** They come from a separate pool, backed by the borrower's own locked savings.

## Threat model

| Threat | What could happen | Mitigation | Residual |
|---|---|---|---|
| User's key stolen | Attacker drains the vault | Saved funds only go to `safePlace`; changing it waits the full cooldown; alerts fire on request | Low. The spend wallet is still exposed. |
| Key stolen, attacker uses `advance` | Up to 50% pulled instantly from the pool | Advances pay out to `spendTo`, which itself takes a cooldown to change; alert on every advance; optional guardian approval above a threshold | Medium |
| Malicious guardian | Releases funds the user didn't want | Guardian can only speed up a release the owner requested, to the owner's own `safePlace`; can never receive funds or change settings | Low |
| Advance accounting bug | Debt not covered, or collateral withdrawn | Invariants 2, 3 and 4 with fuzz and invariant tests; fee is a fixed tier worked out at repayment, no compounding | Medium |
| **Fake vault borrows from the pool** | Someone deploys their own contract and borrows against pretend savings | The pool lends only to addresses `factory.isVault` returns true for | Medium until tested |
| **Clone takeover** | Someone initialises a vault or the implementation first and becomes the owner | `initialize` runs once, in the same transaction as creation; only the owner can create their vault; the implementation is locked | Low if tested |
| **Same-code bug in every vault** | One logic bug affects all users | Small code, fuzz and invariant tests, Slither, deposit cap. No upgrade path, so the response is a new factory and a migration | Medium |
| **Pool loses money** | A bug drains the advance pool | The pool is small, separate from user savings, and the builder's own money | Low for users, real for the builder |
| Reentrancy / ERC-20 quirks | Funds drained or stuck | `SafeERC20`, `ReentrancyGuard`, checks-effects-interactions, USDC only (no fee-on-transfer or rebasing tokens) | Medium |
| Rounding | Dust lost or created | `keepBps` maths rounds in the user's favour (keep the remainder); invariant 9 checks the balances | Low |
| Keeper key leaked | Attacker calls `process()` | `process()` is callable by anyone by design, and only performs the owner's own split rules. Nothing else is permissioned. | Low |
| Frontend compromised | Users tricked into bad settings | Settings changes that weaken protection are delayed and alerted; contract addresses published on the site, X and Arbiscan | Medium |
| Fake site / phishing | Deposits to an attacker | Publish the verified factory address everywhere; in-app "verified contract" badge | Medium |
| USDC freeze | Circle blacklists an address | Documented, not mitigable. Multi-token support later spreads the risk. | Medium |
| Aave risk (later) | Yield protocol loss | Opt-in only, a standard protocol not the highest rate, rate and risk shown, cap the share of each vault | Deferred |
| User locks themselves out | Can't reach money in an emergency | Cooldown is capped at 30 days and is always cancellable; guardian path; advance covers urgent cash | Low |
| **User loses every device** | No way back into the passkey account | Passkey-only has no recovery by design. The app asks for a second passkey at setup; the optional guardian can help with a stuck withdrawal. We cannot reset it and we say so. | **Medium, accepted for the MVP** |
| **Provider in the signing path (later, Privy)** | A third party's outage, terms change or compromise, or a takeover of the user's login account, affects signing | Offered as a choice, not forced. The user can export their key. The vault limits damage: savings only go to the safe address, changes wait, alerts fire. | Deferred |
| **Regulatory: custody** | A regulator treats the product as custody | Only the user can move their savings; no shared pool; plain-language user agreement; capped mainnet; get legal advice before real users. This is not legal advice. | **Open** |

## Practices

- Foundry unit, fuzz and invariant tests; see [`TESTING.md`](TESTING.md).
- Slither static analysis before each deployment.
- Contracts verified on Arbiscan; addresses in the README.
- Deposit cap enforced in the contract, not just the UI.
- A plain-language user agreement before any real user.
- No secrets in the repo; `.env.example` lists every key by name only.

## Reporting a problem

Open a GitHub issue, or DM the project account on X. If it's a live vulnerability, please don't post details publicly first.

## Before removing the cap

External audit, a bug bounty, legal advice on custody, and a written incident plan. Not before.
