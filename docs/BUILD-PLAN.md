# Build plan — Arbitrum sprint

Written 27 Sep 2026, on the `dev` branch. This plans everything left before the Arbitrum submission: front end first on mock data, then contracts, then wiring, then the demo. `main` and `keepyours.xyz` are untouched by this work; see "Branch and directory" below.

One task = up to **8 hours = one solo dev-day**. Where a day holds two tasks, they're each half a day.

**Stack correction, 28 Sep 2026:** the app is TypeScript, not JavaScript, in the standard shadcn-style structure (root `components/`, `lib/`, `hooks/`, `@/*` alias), and PWA support runs through `@ducanh2912/next-pwa` rather than a hand-rolled service worker — matching a proven earlier PWA build. T0.1 and T1.1's original JS work was migrated in place; every task from here on is written in TS from the start. See `docs/ARCHITECTURE.md`'s Pieces table.

## Capacity check

| | |
|---|---|
| Work planned below, nothing trimmed | **72 hours** |
| Days from today to the Arbitrum deadline (27 Sep–4 Oct, inclusive, 8h/day) | **64 hours** |
| Gap | **8 hours short, i.e. 1 extra hour/day across 8 days** |

**Decision (27 Sep 2026): accept the slip.** Nothing below is trimmed; Nimsara is putting in more than 8h on the heavier days rather than cutting scope. The demo recording will likely land nearer **3 Oct** than the DEMO-SCRIPT.md target of 2 Oct, which leaves little slack before the **4 Oct, 21:29** deadline — worth watching as the week goes, and revisiting this call if a task runs badly over.

**Already out of this cycle**, per `CLAUDE.md`'s cut line and `SPEC.md`: guardian, verified send, Privy sign-in, yield, score-based limits, the emergency page, and "I have a wallet" (seed-phrase fallback). All listed under Hold at the bottom, not forgotten, just not in the 72 hours above.

## Branch and directory

- All work happens on **`dev`**, branched from `main` today. `main` stays exactly as it is; `keepyours.xyz` only ever deploys `main`, so the live waitlist is not touched by anything here.
- Pushing `dev` gives a Vercel **preview URL** automatically, separate from production, to check progress on a phone.
- The product app lives at **`/app`**, a new route (`app/app/...` in the Next.js directory), next to the untouched waitlist at `/` (`app/page.jsx`). Screens: `/app` (install gate), `/app/setup`, `/app/home`, `/app/withdraw`, `/app/advance`.
- Contracts live in a new **`contracts/`** directory (Foundry), which doesn't exist yet.
- Merge `dev` into `main` only when the app is ready to go live, which repoints `keepyours.xyz` at it.

## Epics, stories and tasks

Status: `Todo` · `Hold` (planned for later, not this cycle).

### E0 — Setup (3h)

| ID | Task | Hours | Depends on |
|---|---|---|---|
| T0.1 | Create `contracts/` (Foundry init, OpenZeppelin, remappings) and `app/app/` route scaffold. `.env.example` gets `ZERODEV_PROJECT_ID`, `NEXT_PUBLIC_FACTORY`, `NEXT_PUBLIC_POOL`. | 3h | — |

**Your action, not dev hours:** create a free ZeroDev Sandbox project, attach `keepyours.xyz` to Vercel (it's not attached yet), and have SSH access ready on the Hetzner VPS for E5. None of these block Todo tasks below, but the first two block real passkey testing in E2, and the third blocks E5.

### E1 — Front-end shell (7h)

| ID | Task | Hours | Depends on | Status |
|---|---|---|---|---|
| T1.1 | Install gate: detect standalone/installed state; mobile browser tab shows install steps (Android prompt, iOS Share → Add to Home Screen); desktop shows a QR page; a small "continue in browser (demo)" link for reviewers. | 5h | T0.1 | Todo |
| T1.2 | Onboarding carousel (3 slides: split, waiting period, advance) | 2h | T1.1 | Todo |

### E2 — Passkey wallet (8h)

| ID | Task | Hours | Depends on | Status |
|---|---|---|---|---|
| T2.1 | ZeroDev Kernel account with a passkey signer: first-open creates the passkey and the wallet (one Face ID/Touch ID prompt); later opens are a single "Unlock". | 5h | T0.1, your ZeroDev project | Todo |
| T2.2 | Second-passkey prompt at setup (lost-device mitigation) | 1h | T2.1 | Todo |
| T2.3 | In-app-browser detection (Telegram, X) → "open in Safari/Chrome" screen | 2h | T2.1 | Todo |

### E3 — Demo-critical screens, on mock data (16h)

Built against a fake data layer so nothing here waits on contracts. Matches DEMO-SCRIPT.md shots 3, 4, 5 and 6.

| ID | Task | Hours | Depends on | Status |
|---|---|---|---|---|
| T3.1 | Setup screen: split % (spend/keep), cooldown presets (72h / 7d / 14d / 30d) | 4h | T1.1 | Todo |
| T3.2 | Home screen: balance, spend/keep split bar, activity list, get-paid link + QR | 4h | T3.1 | Todo |
| T3.3 | Withdraw screen: request, live countdown, cancel, "alert sent" note | 4h | T3.2 | Todo |
| T3.4 | Advance screen: amount up to 50%, fee tiers (free 30 days → 1.5% → 3%), confirm | 4h | T3.2 | Todo |

### E4 — Contracts (20h)

Per `docs/CONTRACTS.md`: vault, factory, pool, 11 invariants. This is the never-cut part of the MVP — see `SPEC.md`.

| ID | Task | Hours | Depends on | Status |
|---|---|---|---|---|
| T4.1 | `KeepVault` implementation: state, `initialize`, `process()`, `requestWithdraw`/`cancelWithdraw`/`executeWithdraw`, settings propose/apply. Unit tests for each. | 8h | T0.1 | Todo |
| T4.2 | `KeepVaultFactory` (CREATE2 clone, `predictVault`, registry) and `AdvancePool` (`fund`, `lend`, `repay`, `settle`, `setFactory` once). Unit tests. | 8h | T4.1 | Todo |
| T4.3 | Fuzz and invariant tests for all 11 invariants; Slither pass. | 4h | T4.2 | Todo |

### E5 — Wire to testnet (10h)

The app itself stays on Vercel. The keeper (calls `process()`/`settle()` for anyone) and the Telegram bot run as a standing Node process on the **Hetzner VPS**, not on Vercel — Vercel's own free cron only runs once a day (checked on Vercel's pricing page, 27 Sep 2026), far too slow to feel real in the demo, and Pro's per-minute cron costs $20/month for something the VPS already does for free, continuously.

| ID | Task | Hours | Depends on | Status |
|---|---|---|---|---|
| T5.1 | Deploy contracts to Arbitrum Sepolia, verify on Arbiscan. Replace mock data in E3's screens with real reads/writes (viem/wagmi). | 4h | T4.3, T3.4 | Todo |
| T5.2 | VPS setup: non-root deploy user, SSH-key-only login, firewall (only SSH + what's needed outbound). Deploy the keeper + Telegram bot as one long-lived Node process (systemd or pm2, auto-restart on crash/reboot). It watches vault events — a live subscription if the RPC provider supports it, polling every 15–30s otherwise (confirm which when building) — and calls `process()`/`settle()` plus sends the Telegram alert. The keeper's own wallet holds only a small amount of Sepolia ETH for gas, in a dedicated key, never the deployer key. | 6h | T5.1, VPS access | Todo |

### E6 — Demo and submission (8h)

| ID | Task | Hours | Depends on | Status |
|---|---|---|---|---|
| T6.1 | Fund two Sepolia wallets, give the vault some real history, rehearse and record the demo per `DEMO-SCRIPT.md`. | 4h | T5.2 | Todo |
| T6.2 | Fill `SUBMISSION.md` with real addresses and links, run the final checklist, submit. | 4h | T6.1 | Todo |

## Hold — not in this cycle

These are real, documented features, just not built this week. Each links to where it's already specified so nothing is lost.

| Item | Where it's specified | Why held |
|---|---|---|
| Guardian | `SPEC.md` §4 | Already Stretch; first on the cut line |
| Verified send | `SPEC.md` §6 | Third on the cut line; a plain send with a network warning stands in |
| "I have a wallet" fallback | `ARCHITECTURE.md` | Passkey-only for the MVP, per the 27 Sep decision |
| Privy sign-in | `SPEC.md` §9 | Later, by design; adds a provider to the signing path |
| Emergency page | `SPEC.md` §10 | Later; needed before the "works without our app" claim is fully true for passkey users |
| Yield (Aave) | `SPEC.md` §7 | Target 12 Oct, not 4 Oct |
| Score-based advance limits | `SPEC.md` §8 | Later, needs outside data |

## Timeline

```mermaid
gantt
    title Keep Yours — Arbitrum sprint
    dateFormat  YYYY-MM-DD
    axisFormat  %d %b
    todayMarker on

    section Setup
    E0 Repo, Foundry, /app scaffold        :e0, 2026-09-27, 1d

    section Front end (mock data)
    E1 Install gate + shell                :e1, after e0, 1d
    E2 Passkey wallet                      :e2, after e1, 1d
    E3 Setup + Home screens                :e3a, after e2, 1d
    E3 Withdraw + Advance screens          :e3b, after e3a, 1d

    section Contracts
    E4 Vault + tests                       :e4a, after e0, 1d
    E4 Factory + Pool + tests              :e4b, after e4a, 1d
    E4 Fuzz, invariants, Slither           :e4c, after e4b, 12h

    section Wire and demo
    E5 Deploy Sepolia + wire + VPS keeper  :e5, after e3b, 1d
    E6 Record demo                         :milestone, e6a, 2026-10-03, 0d
    E6 Submit Arbitrum                     :crit, e6b, after e5, 1d

    section Deadline
    Arbitrum deadline 21:29                :milestone, crit, 2026-10-04, 0d
```

Contracts (E4) run on a separate track from the front end (E1–E3): both start after E0, because a solo developer works one at a time, so the dates above are the **order** of work, not two people in parallel. Read the table hours, not just the bar chart, for the real total.

## After Arbitrum: Colosseum (aim 12 Oct, deadline 13 Oct ~12:29)

Mostly reuses this build. Not broken into 8h tasks yet, since it depends on how Arbitrum submission goes.

- Colosseum's own write-up (`SUBMISSION.md` has the section list already).
- Whatever from Hold is worth doing with the extra week — guardian and verified send are the natural next picks.
- More testnet users, since Colosseum's judging criteria include functionality and impact.

## What I need from you

1. ~~Trim or slip?~~ **Resolved 27 Sep: accept the slip.**
2. **Confirm the epic order** — front end (E1–E3), contracts (E4), wiring (E5), demo (E6). Contracts could run first instead; say if you'd rather.
3. When it's time for E5: SSH access to the Hetzner VPS (or you run the deploy commands yourself from a runbook I write).
4. Once you're happy with this doc, tell me and I'll turn each task into a GitHub issue with labels for the epic and status, so you can move them across a project board as we go.
