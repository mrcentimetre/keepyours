# Demo script

Target: **under 5 minutes** (Colosseum's limit). Record on 2 Oct, so there's a day of slack before the Arbitrum deadline.

Write this before building, because it decides which screens must actually work.

## Shot list

| # | Time | On screen | What I say |
|---|---|---|---|
| 1 | 0:00–0:15 | Face or logo | "My friends in Sri Lanka get paid in dollars from clients all over the world. Getting paid is solved. **Keeping** it isn't. Their savings are one tap away from a futures button." |
| 2 | 0:15–0:45 | Telegram chat screenshot, then the Reddit thread | "This is a message from my builders club. And this is the same thing from 600 people on Reddit. Money arrives, and within a week it's gone into a trade." |
| 3 | 0:45–1:15 | App: setup screen, split slider, cooldown | "Keep Yours takes one setting. 60% to spend, 40% to keep. Withdrawals from the kept part wait 72 hours." |
| 4 | 1:15–2:00 | Second wallet sends $100 USDC → home screen updates | "A client pays. The contract splits it live on Arbitrum: $60 to my spending wallet, $40 into the vault." Show the transaction on Arbiscan. |
| 5 | 2:00–2:40 | Withdraw screen at 2am, countdown, cancel | "Here's the part that matters. I try to take it out at 2am. A 72-hour timer starts, my phone buzzes, and cancelling is one tap." |
| 6 | 2:40–3:20 | Advance screen: $30 advance, fee, payout | "But real needs exist. Rent is due before the client pays. I take an advance against my **own** savings: $30 now, free for the first 30 days. It comes from a small advance pool, and my savings stay locked as the security. No credit check, nobody to chase." |
| 7 | 3:20–3:50 | Another payment lands → repayment first, then split | "The next client payment repays it automatically, before the split. The loop closes itself." |
| 8 | 3:50–4:20 | Architecture slide | "Every user gets their own vault contract on Arbitrum. Passkey wallet, sponsored gas, so no seed phrase and no ETH. Everything is enforced by code, not by us: we can't touch anyone's money." |
| 9 | 4:20–4:50 | Numbers + roadmap slide | "X people tested it this week. Y said they'd use it with real money. Yield on savings and cross-chain payments are next." |
| 10 | 4:50–5:00 | Logo, URL, handle | "Keep Yours. keepyours.xyz. Get paid, keep yours." |

## Rules for the recording

- **Use real transactions**, not mockups. Judges can check them on Arbiscan, and it's the difference between a demo and a video.
- **Use small real amounts** so nothing is at risk.
- Keep the phone screen big; record in portrait and crop, or use a device mirror.
- No background music over speech.
- Say the numbers out loud. "$60 to spend, $40 kept" lands better than pointing.
- **Never claim users you don't have.** Shot 9 must state exactly what happened: interviews, testnet testers, or two mainnet users.

## Things to prepare before recording

- [ ] Two funded wallets (payer and me)
- [ ] A vault with some history, so the home screen isn't empty
- [ ] The cooldown set short for the demo, but say out loud that it's 72h by default
- [ ] Telegram open, to show the alert arriving
- [ ] Arbiscan tab with the verified contract
- [ ] Screenshots from the club chat, with permission and names blurred
