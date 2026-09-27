# Build plan — Arbitrum sprint

Written 27 Sep 2026, on the `dev` branch. This plans everything left before the Arbitrum submission: front end first on mock data, then contracts, then wiring, then the demo. `main` and `keepyours.xyz` are untouched by this work; see "Branch and directory" below.

One task = up to **8 hours = one solo dev-day**. Where a day holds two tasks, they're each half a day.

## Capacity check first, because the numbers matter

| | |
|---|---|
| Work planned below (every task, including the two marked `Hold (recommended)`) | **70 hours** |
| Days from today to the Arbitrum deadline (27 Sep–4 Oct, inclusive, 8h/day) | **64 hours** |
| Gap before any trim | **6 hours short** |
| Gap after the two recommended trims (T1.2, T2.2, 3h together) | **still 3 hours short** |

So the recommended trims help but don't fully close it — I checked the arithmetic twice after catching my own first draft understating it. That residual 3 hours means the demo recording likely slips from the DEMO-SCRIPT.md target of **2 Oct** toward **3 Oct**, leaving little slack before the **4 Oct, 21:29** deadline. Three ways to handle it, pick one:

1. **Trim more:** on top of T1.2 and T2.2, I can cut about 2h from T1.1 (a plainer desktop gate) and 1h from T6.2 (`SUBMISSION.md` is already templated, mostly fill-in), which closes it fully. Not written into the tasks below yet — say the word and I will.
2. **Trim only the two already marked, accept 3h of slip.**
3. **Trim nothing, accept 6h of slip**, recording nearer 3 Oct with no slack before the deadline.

Say which, and I'll mark the doc accordingly before it becomes GitHub issues.

**Already out of this cycle**, per `CLAUDE.md`'s cut line and `SPEC.md`: guardian, verified send, Privy sign-in, yield, score-based limits, the emergency page, and "I have a wallet" (seed-phrase fallback). All listed under Hold at the bottom, not forgotten, just not in the 70 hours above.

## Branch and directory

- All work happens on **`dev`**, branched from `main` today. `main` stays exactly as it is; `keepyours.xyz` only ever deploys `main`, so the live waitlist is not touched by anything here.
- Pushing `dev` gives a Vercel **preview URL** automatically, separate from production, to check progress on a phone.
- The product app lives at **`/app`**, a new route (`app/app/...` in the Next.js directory), next to the untouched waitlist at `/` (`app/page.jsx`). Screens: `/app` (install gate), `/app/setup`, `/app/home`, `/app/withdraw`, `/app/advance`.
- Contracts live in a new **`contracts/`** directory (Foundry), which doesn't exist yet.
- Merge `dev` into `main` only when the app is ready to go live, which repoints `keepyours.xyz` at it.

## Epics, stories and tasks

Status: `Todo` · `Hold` (planned for later, not this cycle) · `Hold (recommended)` (cut to close the capacity gap, pending your yes).

### E0 — Setup (3h)

| ID | Task | Hours | Depends on |
|---|---|---|---|
| T0.1 | Create `contracts/` (Foundry init, OpenZeppelin, remappings) and `app/app/` route scaffold. `.env.example` gets `ZERODEV_PROJECT_ID`, `NEXT_PUBLIC_FACTORY`, `NEXT_PUBLIC_POOL`. | 3h | — |

**Your action, not dev hours:** create a free ZeroDev Sandbox project and attach `keepyours.xyz` to Vercel (it's not attached yet). Neither blocks Todo tasks below, but both block real passkey testing in E2.

### E1 — Front-end shell (5h, was 7h)

| ID | Task | Hours | Depends on | Status |
|---|---|---|---|---|
| T1.1 | Install gate: detect standalone/installed state; mobile browser tab shows install steps (Android prompt, iOS Share → Add to Home Screen); desktop shows a QR page; a small "continue in browser (demo)" link for reviewers. | 5h | T0.1 | Todo |
| T1.2 | Onboarding carousel (3 slides: split, waiting period, advance) | 2h | T1.1 | **Hold (recommended)** — the demo script doesn't need it; setup screen explains the same thing live |

### E2 — Passkey wallet (7h, was 8h)

| ID | Task | Hours | Depends on | Status |
|---|---|---|---|---|
| T2.1 | ZeroDev Kernel account with a passkey signer: first-open creates the passkey and the wallet (one Face ID/Touch ID prompt); later opens are a single "Unlock". | 5h | T0.1, your ZeroDev project | Todo |
| T2.2 | Second-passkey prompt at setup (lost-device mitigation) | 1h | T2.1 | **Hold (recommended)** — worth doing, just not this week |
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

### E5 — Wire to testnet (8h)

| ID | Task | Hours | Depends on | Status |
|---|---|---|---|---|
| T5.1 | Deploy to Arbitrum Sepolia, verify on Arbiscan. Replace mock data in E3's screens with real reads/writes (viem/wagmi). | 4h | T4.3, T3.4 | Todo |
| T5.2 | Telegram bot on contract events (`Processed`, `WithdrawRequested`, `Advanced`, `AdvanceRepaid`); wire the withdraw alert into the app. | 4h | T5.1 | Todo |

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
| Second passkey at setup | this doc, T2.2 | Recommended trim, see capacity check |
| Onboarding carousel | this doc, T1.2 | Recommended trim, see capacity check |
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
    E5 Deploy Sepolia + wire + Telegram    :e5, after e3b, 1d
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

1. **Trim or slip?** (see Capacity check)
2. **Confirm the epic order** — front end (E1–E3), contracts (E4), wiring (E5), demo (E6). Contracts could run first instead; say if you'd rather.
3. Once you're happy with this doc, tell me and I'll turn each task into a GitHub issue with labels for the epic and status, so you can move them across a project board as we go.
