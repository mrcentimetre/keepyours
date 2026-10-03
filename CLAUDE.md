# Keep Yours — project context

Read this before touching anything. It's the short version of decisions already made, so they don't get re-litigated.

## What this is

A savings layer on Arbitrum for people paid in stablecoins. Every USDC payment splits into spend and save. The saved part sits behind a cooldown, earns yield later, and can be borrowed against when a client pays late.

**Tagline:** Get paid. Keep yours.

Full detail: `docs/SPEC.md`. Contract design and the invariants: `docs/CONTRACTS.md`.

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
- App: Next.js (App Router) + TypeScript + Tailwind CSS v4 + wagmi/viem, mobile-first PWA (`@ducanh2912/next-pwa`)
- Structure: standard shadcn-style layout — root-level `components/`, `lib/`, `hooks/`, `@/*` path alias to repo root, not `src/`
- Alerts: contract events → Telegram bot
- Hosting: Vercel, domain keepyours.xyz

Why each: `docs/ARCHITECTURE.md`.

## Scope and the cut line

**MVP for 4 Oct (never cut):** auto-split, cooldown vault, advance against savings.

**Cut in this order if short on time:** guardian → keeper (the app calls `process()` itself) → verified send. If the advance pool is not solid by 28 Sep, ship the advance on testnet only.

**After the hackathon:** Aave yield, cross-chain deposits via Daimo, guardian, more markets, score-based advance limits.

## Design decisions (26 Sep 2026, after mentor feedback)

- **One vault contract per user**, an EIP-1167 clone made by a factory. No shared pool of savings.
- **Advances come from a separate advance pool** (the builder's own small capital), never from other users' savings.
- **Advance fee:** free for 30 days, then 1.5%, then 3%. After day 90 anyone can settle from the borrower's savings. No penalty in the MVP.
- **Yield later, from a standard protocol (Aave v3)**, never a custodial platform. Safety over rate.
- **Security is priority one.** User agreement before real users. Mainnet stays capped.

## Front end decisions (27 Sep 2026)

- **Passkey only for the MVP.** No third party in the signing path. Privy sign-in is a later option, never forced.
- **Installed PWA on a phone.** Mobile browser tab shows install steps; desktop shows a gate page with a QR code. Installing is required (3 Oct 2026): no visible "continue in browser" link. Judges on a laptop get `/app?demo=1`, shared only in the submission.
- **The front end is built first, on a mock data layer**, and the contracts are wired in afterwards.
- **Attach keepyours.xyz to Vercel before anyone creates a passkey.** Passkeys are tied to the domain.
- **New work happens on `dev`**, product screens under `app/app/`, `main` stays deployed as-is. See `docs/BUILD-PLAN.md`.
- **Keeper + Telegram bot run on Nimsara's Hetzner VPS**, not on Vercel (its free cron is once a day). The app itself stays on Vercel.
- **Full scope, no trimming, is accepted to run ~8h over the week** (27 Sep–4 Oct); Nimsara works past 8h/day rather than cut features. Revisit if a task runs badly over.

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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
