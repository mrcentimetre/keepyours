# Spec

Last updated: 26 Sep 2026.

## Who this is for

Freelancers, contractors and web3 contributors paid in USDC/USDT, starting with Sri Lanka. They already spend through crypto cards and cash out through one trusted P2P seller. What they lack is a way to keep part of what they earn.

## The rule the product enforces

> Money that arrives gets split. The saved part is slow to leave. Emergencies have a path that isn't "give up and trade it".

## Features

Priority key: **MVP** = must work for the 4 Oct demo · **Stretch** = if time allows · **Later** = after the hackathon.

### 0. Onboarding and install — MVP

- **Passkey only.** First open creates a passkey (one Face ID prompt) and with it the wallet. Later opens are one "Unlock" button. No email, no password, no seed phrase.
- The app is an **installed PWA** on a phone. A mobile browser tab shows install steps; desktop shows a gate page with a QR code and a phone-shaped preview. A small "continue in browser (demo)" link stays for reviewers.
- After creating a passkey, a one-time notice explains that platform sync (iCloud Keychain, Google Password Manager) is the only backup, and that losing every device means losing the wallet. **Not a working second-signer mechanism** — building one needs a multi-validator setup that doesn't exist yet, and a button implying real recovery without one would be misleading. Real multi-device recovery is a later, separately scoped feature.
- "I have a wallet" is the fallback for people who prefer a seed-phrase wallet.
- The domain must be live before anyone creates a passkey. Passkeys are tied to it.

### 1. Get paid link — MVP

- Create a request: amount, optional note.
- Shareable URL and QR code.
- The link points at **your own vault address**, which is known before the vault exists.
- Payer sends USDC on Arbitrum. No network choice, no memo, no gas token needed for the receiver.
- **Later:** pay from any chain through a Daimo session.

### 2. Auto-split — MVP

- One setting: `keepBps`, e.g. 4000 = 40% kept.
- When USDC arrives, `process()` (called by the app, or a keeper) repays any open advance first, then sends the spend share to `spendTo`, then adds the rest to `saved`.
- Changing the split takes effect immediately (it can only affect future payments).

### 3. Cooldown vault — MVP

- **Each user has their own vault contract.** There is no shared pool of savings.
- `cooldown` is chosen at setup: 1 to 30 days, default 72 hours. The app offers presets: **72 hours, 7 days, 14 days, 30 days**.
- `requestWithdraw(amount)` starts the timer and emits an event (the app sends a Telegram alert).
- `cancelWithdraw()` any time before release.
- `executeWithdraw()` after the cooldown, **to `safePlace` only**.
- Weakening a setting (shorter cooldown, new safe address) only applies after the current cooldown has passed.

### 4. Guardian — Stretch

- Optional address. Can call `guardianApprove()` to release a withdrawal the owner already requested.
- Cannot change settings, cannot receive funds, cannot start a withdrawal.

### 5. Advance — MVP

- Borrow up to **50% of your savings**. Your savings stay locked as the security until it is repaid.
- The money comes from the **advance pool**: separate money seeded by the builder, never other users' savings.
- **Free for the first 30 days.** Then 1.5% (days 31 to 60) and 3% (days 61 to 90). No penalty.
- Paid out to `spendTo`. Repaid automatically from the next deposits, before the split.
- After day 90, anyone can trigger settlement and what is owed is taken from `saved`.
- One open advance at a time.
- **Hackathon scale:** the pool is small. On testnet it is test USDC. On mainnet it is a few tens of dollars.

### 6. Verified send — MVP

- Address book: label, network, token, optional memo.
- First send to a new destination must be a $1 test; the app marks it verified afterwards.
- Hard block when the destination network doesn't match the asset being sent.
- Contract-side, funds can only leave to `spendTo` or `safePlace`, so the address book is a UI safety layer.

### 7. Yield — Later (target 12 Oct)

- Opt-in. Supply `saved` to Aave v3 USDC on Arbitrum; the vault holds aUSDC.
- **Safety over rate:** a standard, established protocol, not the highest-yield one. Cap the share of each vault. Show the variable rate and a plain-language risk note. Never promise a yield.
- No custodial platform (Coinbase and similar): it would end non-custodial.
- Revenue: 15% of yield earned, taken on withdrawal.

### 8. Trust-based limits — Later

- Raise the advance limit above 50% using an on-chain or social score (Nomis, Ethos and similar, as credi.fi does).
- Needs outside data and means lending against less than the full amount, so it is not for the hackathon.

### 9. Privy sign-in — Later

- Sign in with Google or email, with key export and recovery, for people who do not want to manage a passkey.
- Works with ZeroDev as the signer for the same smart account. Free for the first 499 monthly users (Privy pricing page, checked 26 Sep 2026).
- It puts a provider in the signing path, so it is a choice next to the passkey, never the only option. If there is time before 4 Oct it may be added; otherwise it waits.
- The exact recovery mode and what happens if someone takes over the user's login account are still to be read in Privy's docs.

### 10. Emergency page — Later

- A small standalone page in the repo, hostable by anyone, that builds the passkey signature and calls `requestWithdraw` and `executeWithdraw` on the user's vault. It is what makes "works without our app" true for passkey users.

## Out of scope on purpose

Cards, bank cash-out, P2P trading, invoicing, tax reports. Peanut and the card issuers already do these, and Keep Yours is meant to sit beside them.

An **early-release penalty** is also out of the MVP. If it is added later it must be a fixed, capped fee written in code and in the user agreement.

## The cut line

If day 6 (29 Sep) arrives and any of these aren't working, drop them in this order:

1. Guardian
2. Keeper (the app calls `process()` itself instead of a background job)
3. Verified send (fall back to a plain send with a network warning)

**If the advance pool isn't solid by 28 Sep:** ship the advance on testnet only and keep mainnet to split plus waiting period.

**Never cut:** auto-split, cooldown vault, advance. Those three are the demo.

## Legal and user agreement

Custody law varies by country and this is not legal advice. The design principle is that only the user can move their savings. Before real users, publish a plain-language **user agreement** (what the waiting period, fees and settlement do), keep mainnet capped, and get proper advice.

## Success criteria for 4 Oct

- Contracts deployed and verified on Arbitrum One.
- A real payment splits live in the demo video.
- A withdrawal request shows a countdown and can be cancelled.
- An advance is taken from the pool and then repaid automatically by the next payment.
- At least 3 people other than me have used it on testnet.
