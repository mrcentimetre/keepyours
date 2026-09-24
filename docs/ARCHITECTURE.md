# Architecture

## The whole system in one path

```
client  --USDC-->  forwarder (per user)  --sweep()-->  KeepVault
                                                          |
                                     +--------------------+--------------------+
                                     |                    |                    |
                              repay owed            spend share            saved
                                                     -> spendTo        (+ Aave later)
                                                                             |
                                                       requestWithdraw -> cooldown -> safePlace
```

## Pieces

| Layer | Choice | Why |
|---|---|---|
| Chain | **Arbitrum One** (Sepolia for testing) | Native USDC, cents per transaction, RIP-7212 precompile makes passkey wallets cheap, sponsor of the buildathon |
| Contract | `KeepVault.sol`, OpenZeppelin `SafeERC20` + `ReentrancyGuard` | Small surface, not upgradeable, no admin withdraw |
| Deposit address | Minimal-proxy forwarder per user, deployed with CREATE2 | The payer just sends USDC to an address; no dApp needed on their side |
| Sweep | `sweep()` callable by anyone; app calls it, plus a Gelato/Defender job as backup | A plain ERC-20 transfer can't run code on arrival |
| Wallet | **ZeroDev** Kernel smart account with a passkey signer | No seed phrase. Built by Offchain Labs. Counts as sponsor tech on the submission form |
| Gas | ZeroDev paymaster sponsors user operations | Users never need ETH |
| Frontend | Next.js + wagmi/viem, mobile-first **PWA** | One codebase, installable, works in a browser tab for the demo |
| Reads | viem + event logs; small indexer (Ponder or a cron) if needed | No database of balances; the contract is the source of truth |
| Alerts | Contract events → Telegram bot; web push later | Telegram is where these users already are |
| Hosting | Vercel | Fast deploys, preview URLs, custom domain |
| Tests | Foundry: unit, fuzz and invariant tests; Slither | The invariants in CONTRACTS.md are the spec |

## Why a forwarder plus a sweep

USDC is a plain ERC-20. Sending it to a contract does **not** call the contract, so the split can't happen inside the transfer. The forwarder is a cheap per-user address that holds the funds until someone calls `sweep()`, which moves them into `KeepVault` and triggers the split.

- Anyone can call `sweep()`, including the user from the app, so a dead keeper never traps funds.
- Funds in a forwarder can only go to `KeepVault`.
- **Cut plan:** if this isn't solid by 29 Sep, drop it and use "Deposit from wallet" (approve + `deposit`) in the app.

## Passkeys, practically

- Passkeys are WebAuthn, so they need **HTTPS and a stable domain**. A passkey created on a Vercel preview URL will not work on keepyours.xyz, so the domain goes live before anyone is onboarded.
- **In-app browsers** (Telegram, X) often fail to create passkeys. The app detects them and shows "open in Safari/Chrome".
- Fallback path: "I have a wallet" (injected or WalletConnect).

## Environments

| | Testnet | Mainnet |
|---|---|---|
| Chain | Arbitrum Sepolia | Arbitrum One |
| USDC | Circle faucet test USDC | Native USDC |
| Who | Club members testing | Me, plus capped pilot users |
| Cap | none | $200 per vault |

## What is deliberately not here

No backend database of user funds, no custody, no admin keys, no off-chain matching engine. If the frontend disappears, a user can still call `requestWithdraw` and `executeWithdraw` straight from Arbiscan.
