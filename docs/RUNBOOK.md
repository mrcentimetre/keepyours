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
| KeepVault | TBD | TBD |

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

Record the address in the README and in `docs/SUBMISSION.md`.

## Deploy to mainnet

Checklist before running:

- [ ] All tests green, Slither reviewed
- [ ] Deposit cap set in the constructor
- [ ] `feeSink` set to an address you control
- [ ] Deployer wallet funded with ~0.01 ETH on Arbitrum One

```bash
forge script script/Deploy.s.sol \
  --rpc-url $ARBITRUM_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast --verify \
  --etherscan-api-key $ARBISCAN_API_KEY
```

Then:

1. Open the contract on Arbiscan and confirm the source is verified and readable.
2. Open your own vault with $5 and run the manual test list in `TESTING.md`.
3. Update the README table, `SUBMISSION.md`, and the site footer with the address.

## If verification fails

```bash
forge verify-contract <ADDRESS> src/KeepVault.sol:KeepVault \
  --chain arbitrum \
  --constructor-args $(cast abi-encode "constructor(address,address,uint16,uint256)" <USDC> <FEE_SINK> 150 200000000) \
  --etherscan-api-key $ARBISCAN_API_KEY
```

## Frontend

```bash
cd app
pnpm install
pnpm dev            # local
vercel --prod       # deploy
```

Environment variables to set in Vercel: `NEXT_PUBLIC_CHAIN`, `NEXT_PUBLIC_KEEPVAULT`, `NEXT_PUBLIC_USDC`, `ZERODEV_PROJECT_ID`.

Domain: point `keepyours.xyz` at Vercel **before onboarding anyone**, because passkeys are bound to the domain.

## Keeper (sweep job)

The app calls `sweep()` after a deposit is detected. Backup: a scheduled job every 2 minutes that sweeps any forwarder with a non-zero balance.

- Keeper key needs a small amount of ETH on Arbitrum One.
- The keeper can only move funds from a forwarder into the vault. If the key leaks, nothing else is at risk.

## Telegram alerts

```bash
# create a bot with @BotFather, then:
TELEGRAM_BOT_TOKEN=... pnpm run bot
```

The bot listens to contract events and sends: payment split, withdrawal requested (with the release time), withdrawal cancelled, advance taken, advance repaid.

## Incident response

| Problem | Action |
|---|---|
| Bug found in the contract | Post a notice on X and in the app. Tell users to `requestWithdraw`. Do **not** deploy a "fix" over it: there is no upgrade path by design. |
| Keeper down | Users can sweep from the app. Announce it, fix the job. |
| Frontend down | Vault functions still work from Arbiscan. Post the contract link. |
| Someone reports lost funds | Get the transaction hash first. Check the event log before saying anything. |
