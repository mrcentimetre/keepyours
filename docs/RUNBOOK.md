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

```bash
cd app
pnpm install
pnpm dev            # local
vercel --prod       # deploy
```

Environment variables to set in Vercel: `NEXT_PUBLIC_CHAIN`, `NEXT_PUBLIC_FACTORY`, `NEXT_PUBLIC_POOL`, `NEXT_PUBLIC_USDC`, `ZERODEV_PROJECT_ID`, `WAITLIST_ENDPOINT`.

Domain: point `keepyours.xyz` at Vercel **before onboarding anyone**, because passkeys are bound to the domain.

## Keeper (process job)

The app calls `process()` on the user's vault after a deposit is detected. Backup: a scheduled job every 2 minutes that calls `process()` on any vault with unprocessed USDC.

- Keeper key needs a small amount of ETH on Arbitrum One.
- `process()` is callable by anyone and only applies the owner's own split rules. If the keeper key leaks, nothing else is at risk.
- Also run `settle` for any advance past day 90. It is callable by anyone.

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
