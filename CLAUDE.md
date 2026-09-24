# Keep Yours — project context

Read this before touching anything. It's the short version of decisions already made, so they don't get re-litigated.

## What this is

A savings layer on Arbitrum for people paid in stablecoins. Every USDC payment splits into spend and save. The saved part sits behind a cooldown, earns yield later, and can be borrowed against when a client pays late.

**Tagline:** Get paid. Keep yours.

Full detail: `docs/SPEC.md`. Contract design and the 8 invariants: `docs/CONTRACTS.md`.

## Deadlines (Sri Lanka time, UTC+5:30)

| What | When |
|---|---|
| Arbitrum Buildathon submission | **4 Oct, 21:29** (aim to submit 3 Oct) |
| Colosseum, Arbitrum track | **13 Oct, ~12:29** (aim to submit 12 Oct) |

Requirements for both: `docs/SUBMISSION.md`.

## Hard rules

1. **Name:** always "Keep Yours" in writing, logo and UI. Never "Keep" alone: "KEEP" is a live trademark for financial services in the US and UK. People saying "use Keep" out loud is fine.
2. **Never invent traction.** No fake user counts, no "join 2,000 others". State only what actually happened.
3. **No token.** There is no Keep Yours token and no talk of one.
4. **Non-custodial.** No admin key may move user funds. No pause that traps money.
5. **Unaudited.** Mainnet deposits stay capped (about $200 per vault) and the app says so.
6. **Don't promise yield.** It's variable and described that way.
7. **Plain language in the UI.** "Waiting period", not "time-lock". "Savings", not "yield-bearing position".

## Stack

- Contracts: Solidity + Foundry, OpenZeppelin, not upgradeable
- Chain: Arbitrum Sepolia for testing, Arbitrum One for the demo
- Wallet: ZeroDev passkey smart account + paymaster (also counts as sponsor tech on the Arbitrum form)
- App: Next.js (App Router) + Tailwind CSS v4 + wagmi/viem, mobile-first PWA
- Alerts: contract events → Telegram bot
- Hosting: Vercel, domain keepyours.xyz

Why each: `docs/ARCHITECTURE.md`.

## Scope and the cut line

**MVP for 4 Oct (never cut):** auto-split, cooldown vault, advance against savings.

**Cut in this order if short on time:** guardian → deposit forwarder and keeper (fall back to "Deposit from wallet") → verified send.

**After the hackathon:** Aave yield, cross-chain deposits via Daimo, guardian, more markets.

## Brand

Colours: Night `#060E0A`, Card `#12211A`, Keep green `#16B862`, Mint `#62E6A0`, Cooldown amber `#F4B545`, Block red `#FF7070`, Muted `#8CA497`, Ink `#EAF5EF`.

Type: Bricolage Grotesque (display), IBM Plex Sans (body), IBM Plex Mono (numbers).

Amber always means waiting. Red always means blocked. Details: `docs/BRAND.md`.

## Working style

- Small, clearly named commits. The Arbitrum form asks what was built during the window, and the commit history is the evidence.
- **Conventional Commits**, e.g. `feat(web): …`, `fix(contracts): …`, `docs: …`, `chore: …`, `style(web): …`, `test(contracts): …`. No `Co-Authored-By` trailers; the commit history is Nimsara's. **One short line, roughly 50 characters or fewer, no body.**
- Tests are the invariants in `docs/CONTRACTS.md`. Write them alongside the contract, not after.
- Never commit `.env`. Keys are listed by name in `.env.example`.
- Before mainnet: all tests green, Slither reviewed, deposit cap set, verified on Arbiscan.

## Who it's for

Freelancers and web3 contributors paid in USDT/USDC, starting with the SL Web3 Builders Club in Sri Lanka. They already spend through crypto cards and cash out via one trusted P2P seller. What they lack is a way to keep part of it.

Research, competitor analysis and the full proposal live in a separate private repo (`onchain-problem-discovery`) and at https://claude.ai/artifact/9HeCdWLtQBJFMuN1TMJGUt
