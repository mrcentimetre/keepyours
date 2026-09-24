# Spec

Last updated: 24 Sep 2026.

## Who this is for

Freelancers, contractors and web3 contributors paid in USDC/USDT, starting with Sri Lanka. They already spend through crypto cards and cash out through one trusted P2P seller. What they lack is a way to keep part of what they earn.

## The rule the product enforces

> Money that arrives gets split. The saved part is slow to leave. Emergencies have a path that isn't "give up and trade it".

## Features

Priority key: **MVP** = must work for the 4 Oct demo · **Stretch** = if time allows · **Later** = after the hackathon.

### 1. Get paid link — MVP

- Create a request: amount, optional note.
- Shareable URL and QR code.
- Payer sends USDC on Arbitrum. No network choice, no memo, no gas token needed for the receiver.
- **Later:** pay from any chain through a Daimo session.

### 2. Auto-split — MVP

- One setting: `keepBps`, e.g. 4000 = 40% kept.
- On deposit: repay any open advance first, then send the spend share to `spendTo`, then add the rest to `saved`.
- Changing the split takes effect immediately (it can only affect future payments).

### 3. Cooldown vault — MVP

- `cooldown` is chosen at setup: 1 to 30 days, default 72 hours.
- `requestWithdraw(amount)` starts the timer and emits an event (the app sends a Telegram alert).
- `cancelWithdraw()` any time before release.
- `executeWithdraw()` after the cooldown, **to `safePlace` only**.
- Weakening a setting (shorter cooldown, new safe address) only applies after the current cooldown has passed.

### 4. Guardian — Stretch

- Optional address. Can call `guardianApprove(owner)` to release a withdrawal the owner already requested.
- Cannot change settings, cannot receive funds, cannot start a withdrawal.

### 5. Advance — MVP

- `advance(amount)` where `amount + fee <= saved / 2`.
- Flat fee, 1.5% by default, added to `owed`.
- Paid out to `spendTo`.
- Repaid automatically from the next deposits, before the split.
- If nothing arrives within 60 days, `settleExpired()` takes `owed` from `saved`.

### 6. Verified send — MVP

- Address book: label, network, token, optional memo.
- First send to a new destination must be a $1 test; the app marks it verified afterwards.
- Hard block when the destination network doesn't match the asset being sent.
- Contract-side, funds can only leave to `spendTo` or `safePlace`, so the address book is a UI safety layer.

### 7. Yield — Later (target 12 Oct)

- Opt-in. Supply `saved` to Aave v3 USDC on Arbitrum; vault holds aUSDC.
- Show the variable rate and a plain-language risk note.
- Revenue: 15% of yield earned, taken on withdrawal.

## Out of scope on purpose

Cards, bank cash-out, P2P trading, invoicing, tax reports. Peanut and the card issuers already do these, and Keep Yours is meant to sit beside them.

## The cut line

If day 6 (29 Sep) arrives and any of these aren't working, drop them in this order:

1. Guardian
2. Deposit forwarder + keeper (fall back to "Deposit from wallet" in the app)
3. Verified send (fall back to a plain send with a network warning)

**Never cut:** auto-split, cooldown vault, advance. Those three are the demo.

## Success criteria for 4 Oct

- Contracts deployed and verified on Arbitrum One.
- A real payment splits live in the demo video.
- A withdrawal request shows a countdown and can be cancelled.
- An advance is taken and then repaid automatically by the next payment.
- At least 3 people other than me have used it on testnet.
