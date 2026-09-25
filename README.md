# Keep Yours

**Get paid. Keep yours.**

A savings layer on Arbitrum for people paid in stablecoins. Every USDC payment splits automatically into money to spend and money to keep. The kept part sits behind a cooldown so it can't be traded away on impulse, earns yield, and can be borrowed against when a client pays late.

- **Live app:** https://keepyours.xyz *(coming during the buildathon)*
- **Built for:** [Arbitrum Open House Singapore Buildathon](https://www.hackquest.io/hackathons/Arbitrum-Open-House-Singapore-Online-Buildathon) (due 4 Oct 2026) and Colosseum Crypto World's Fair, Arbitrum track (due 12 Oct 2026)
- **Chain:** Arbitrum One · native USDC

---

## The problem

Three things happen between "the client paid" and "I still have the money":

1. **Transfers go wrong.** Wrong network, missing memo, no gas token. Money gone, with no undo.
2. **Savings get traded away.** The money sits one tap from an exchange, so it ends up in a trade.
3. **Payday is fixed, needs aren't.** Clients pay on the 28th; rent is due on the 20th.

Evidence behind each of these (Reddit threads, X posts, interviews with freelancers in Sri Lanka) is in the research notes: https://claude.ai/artifact/9HeCdWLtQBJFMuN1TMJGUt

## What Keep Yours does

| Feature | What it does |
|---|---|
| **Get paid link** | One link per request. The payer can't pick the wrong network. |
| **Auto-split** | Every incoming payment splits by your rule, e.g. 60% spend / 40% keep. |
| **Cooldown vault** | Your own vault contract. Withdrawals wait 72h, 7 days, 14 days or a month (you choose), can be cancelled, and only go to your pre-set safe address. |
| **Guardian** | An optional trusted friend can approve an emergency withdrawal early. They can never take funds. |
| **Advance** | Borrow up to 50% against your own locked savings. Free for 30 days, then 1.5% and 3%. It comes from a separate advance pool, never from other people's savings, and repays itself from your next payments. |
| **Verified send** | Saved exchange addresses with network and memo checks, and a $1 test first. |

Full scope, including what is MVP and what is stretch: [`docs/SPEC.md`](docs/SPEC.md)

## Why it has to be onchain

Only a smart contract can hold you to a rule about money you still control yourself. The cooldown, the safe address and the automatic repayment are enforced by code, not by a company that could change its mind, and anyone can check the rules.

## Contracts

| Network | Contract | Address |
|---|---|---|
| Arbitrum Sepolia | KeepVaultFactory, KeepVault (implementation), AdvancePool | `TBD` |
| Arbitrum One | KeepVaultFactory, KeepVault (implementation), AdvancePool | `TBD` |

Design and invariants: [`docs/CONTRACTS.md`](docs/CONTRACTS.md)

## Run it locally

```bash
git clone https://github.com/mrcentimetre/keepyours
cd keepyours
cp .env.example .env     # fill in your own keys

# web app (waitlist now, the product later)
npm install
npm run dev              # http://localhost:3000

# contracts
cd contracts
forge install
forge test
```

The waitlist form needs `WAITLIST_ENDPOINT` in `.env.local`; see [`docs/WAITLIST.md`](docs/WAITLIST.md).

Deploy and verify steps: [`docs/RUNBOOK.md`](docs/RUNBOOK.md)

## What was built during the buildathon

**Everything in this repository.** The first commit is dated 24 Sep 2026, inside the buildathon window (14 Sep – 4 Oct).

What existed before the window, and is **not** code: user research (Reddit, X and interviews), competitor analysis, and the written proposal. None of it is in this repo; it lives in a separate private research repo.

## Docs

| File | What's in it |
|---|---|
| [`docs/SPEC.md`](docs/SPEC.md) | Features, MVP vs stretch, the cut line |
| [`docs/CONTRACTS.md`](docs/CONTRACTS.md) | Contract design, functions, events, invariants |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How the pieces fit together |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Threat model, limits, unaudited notice |
| [`docs/TESTING.md`](docs/TESTING.md) | What is tested and how |
| [`docs/RUNBOOK.md`](docs/RUNBOOK.md) | Deploy, verify, upgrade-free operations |
| [`docs/DEMO-SCRIPT.md`](docs/DEMO-SCRIPT.md) | The 5-minute demo video, shot by shot |
| [`docs/SUBMISSION.md`](docs/SUBMISSION.md) | Answers and links for both submission forms |
| [`docs/BRAND.md`](docs/BRAND.md) | Colours, fonts, logo, tone |
| [`docs/WAITLIST.md`](docs/WAITLIST.md) | The waitlist page and where its emails go |

## Status

**Unaudited. Deposits are capped during the hackathon.** Don't put in money you can't afford to lose.

## License

MIT, see [`LICENSE`](LICENSE).
