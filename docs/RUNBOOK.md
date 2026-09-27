# Runbook

Commands for deploying and operating Keep Yours. Copy-paste, don't improvise on submission day.

## Setup

```bash
cp .env.example .env
# fill in: ARBISCAN_API_KEY, ARBITRUM_RPC, ARBITRUM_SEPOLIA_RPC, DEPLOYER_PRIVATE_KEY,
#          ZERODEV_PROJECT_ID, TELEGRAM_BOT_TOKEN
```

Never commit `.env`. It's in `.gitignore`.

## Addresses to keep handy

| Thing | Arbitrum One | Arbitrum Sepolia |
|---|---|---|
| USDC (native) | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| KeepVaultFactory | TBD | TBD |
| KeepVault (implementation) | TBD | TBD |
| AdvancePool | TBD | TBD |

*(Verify both USDC addresses on Arbiscan before using them. They're from memory.)*

## Deploy to testnet

```bash
cd contracts
forge build
forge test -vvv

forge script script/Deploy.s.sol \
  --rpc-url $ARBITRUM_SEPOLIA_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast --verify \
  --etherscan-api-key $ARBISCAN_API_KEY
```

The script deploys in this order (see `CONTRACTS.md`): `AdvancePool`, the `KeepVault` implementation, `KeepVaultFactory`, then `pool.setFactory(factory)`, once. Then fund the pool with a little test USDC.

Record the three addresses in the README and in `docs/SUBMISSION.md`.

## Deploy to mainnet

Checklist before running:

- [ ] All tests green, Slither reviewed
- [ ] Deposit cap set in the implementation constructor
- [ ] `feeSink` set to an address you control
- [ ] Advance pool funded with a **small** amount only (a few tens of dollars, your own money)
- [ ] ZeroDev Launch plan active and a gas policy set (mainnet sponsorship is not on the free plan)
- [ ] Deployer wallet funded with ~0.01 ETH on Arbitrum One

```bash
forge script script/Deploy.s.sol \
  --rpc-url $ARBITRUM_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast --verify \
  --etherscan-api-key $ARBISCAN_API_KEY
```

Then:

1. Open each contract on Arbiscan and confirm the source is verified and readable.
2. Create your own vault through the factory with $5 and run the manual test list in `TESTING.md`.
3. Update the README table, `SUBMISSION.md`, and the site footer with the addresses.

## If verification fails

Constructor arguments are placeholders until the contracts exist; use the ones from the deploy script.

```bash
forge verify-contract <ADDRESS> src/KeepVaultFactory.sol:KeepVaultFactory \
  --chain arbitrum \
  --constructor-args $(cast abi-encode "constructor(address,address)" <IMPLEMENTATION> <POOL>) \
  --etherscan-api-key $ARBISCAN_API_KEY
```

Repeat for `AdvancePool` and the `KeepVault` implementation. Clones are verified through the implementation.

## Frontend

The Next.js app lives at the **repo root** (not a separate `app/` package); the product screens are under `app/app/`, next to the waitlist at `app/page.jsx`.

```bash
npm install
npm run dev          # local
vercel --prod        # deploy (production only from main)
```

Environment variables to set in Vercel: `NEXT_PUBLIC_CHAIN`, `NEXT_PUBLIC_FACTORY`, `NEXT_PUBLIC_POOL`, `NEXT_PUBLIC_USDC`, `ZERODEV_PROJECT_ID`, `WAITLIST_ENDPOINT`.

Domain: point `keepyours.xyz` at Vercel **before onboarding anyone**, because passkeys are bound to the domain.

## Keeper and Telegram bot (Hetzner VPS)

These run as **one standing Node process on Nimsara's own VPS**, not on Vercel. Vercel's free cron only runs once a day and its per-minute Pro tier costs $20/month for something the VPS already does, continuously, for free (checked 27 Sep 2026).

**First-time VPS setup**

```bash
# as root, once
adduser keepyours && usermod -aG sudo keepyours
# copy your SSH public key to the new user, then disable root/password login:
#   PermitRootLogin no, PasswordAuthentication no  in /etc/ssh/sshd_config
ufw allow OpenSSH && ufw enable      # only SSH in; outbound stays open for the RPC and Telegram
```

**Deploying the keeper**

```bash
# as the keepyours user
git clone <repo> && cd keepyours/keeper   # a small standalone script, separate from the Next.js app
npm install
cp .env.example .env   # KEEPER_PRIVATE_KEY, ARBITRUM_RPC/ARBITRUM_SEPOLIA_RPC, FACTORY, POOL, TELEGRAM_BOT_TOKEN
chmod 600 .env
pm2 start index.js --name keepyours-keeper
pm2 save && pm2 startup   # survives reboots
```

- It watches every vault the factory has created: a live event subscription if the RPC provider supports WebSockets, otherwise polling every 15–30s (confirm which when building E5 of `BUILD-PLAN.md`), then calls `process()`, `settle()` for advances past day 90, and sends the Telegram alert on each event.
- The keeper's key holds only a small amount of ETH for gas, in a **dedicated key, never the deployer key**.
- `process()` and `settle()` are callable by anyone and only apply each vault's own rules. If the keeper key leaks, nothing else is at risk.
- `pm2 logs keepyours-keeper` to check it's alive; `pm2 restart` after any `.env` or code change.

## Telegram alerts

```bash
# create a bot with @BotFather, then:
TELEGRAM_BOT_TOKEN=... pnpm run bot
```

The bot listens to contract events and sends: payment split, withdrawal requested (with the release time), withdrawal cancelled, advance taken, advance repaid.

## Incident response

| Problem | Action |
|---|---|
| Bug found in the contract | Post a notice on X and in the app. Tell users to `requestWithdraw` from their own vault. Do **not** deploy a "fix" over it: there is no upgrade path by design. A bug in the shared implementation affects every vault, so a fix is a new factory and a migration. |
| Bug in the advance pool | Withdraw the unlent pool liquidity (your own money). Pause nothing else: user vaults are separate and unaffected. |
| Keeper down | Users can call `process()` from the app. Announce it, fix the job. |
| Frontend down | Vault functions still work from Arbiscan. Post the contract link. |
| Someone reports lost funds | Get the transaction hash first. Check the event log before saying anything. |
