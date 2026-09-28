# Architecture

## The whole system in one path

```
client --USDC--> user's own vault (its own address, its own contract)
                        |
                        | process()   (anyone: the app, or a keeper)
        +---------------+----------------+
        |               |                |
  repay advance    spend share        saved (+ Aave later)
  -> AdvancePool   -> spendTo              |
                                           requestWithdraw -> cooldown -> safePlace

AdvancePool --advance--> spendTo      (separate money, never user savings)
after day 90: anyone can settle, and what is owed is taken from that vault's saved
```

## Pieces

| Layer | Choice | Why |
|---|---|---|
| Chain | **Arbitrum One** (Sepolia for testing) | Native USDC, cents per transaction, RIP-7212 precompile makes passkey wallets cheap, sponsor of the buildathon |
| Vault | `KeepVault`, one per user, an EIP-1167 clone of one fixed implementation. OpenZeppelin `SafeERC20` + `ReentrancyGuard` | Each person's savings sit at their own address. No shared pool, no admin withdraw, no upgrade path |
| Factory | `KeepVaultFactory`, CREATE2 with the owner as salt | The vault address is known before it exists, so the get-paid link works from day one |
| Advance money | `AdvancePool`, separate from every vault | Advances never spend other users' savings |
| Split trigger | `process()`, callable by anyone. The app calls it on open, plus a standing keeper as backup | A plain ERC-20 transfer can't run code on arrival |
| Wallet | **ZeroDev** Kernel smart account with a passkey signer. **Passkey only for the MVP.** | No seed phrase, and no third party in the signing path. Built by Offchain Labs. Counts as sponsor tech on the submission form. Privy sign-in (email or Google, with key export and recovery) is a later option |
| Gas | ZeroDev paymaster sponsors user operations | Users never need ETH. **You pay for it** (see costs below) |
| Frontend | Next.js + **TypeScript** + Tailwind CSS v4 + wagmi/viem, mobile-first **PWA** via `@ducanh2912/next-pwa`, hosted on Vercel | One codebase, installable, works in a browser tab for the demo. Standard shadcn-style structure: root `components/`, `lib/`, `hooks/`, `@/*` alias |
| PWA build | `next build --webpack` (next-pwa is a webpack plugin, no Turbopack support); `next dev` stays on Turbopack, since the plugin disables itself in dev anyway | Matches a proven working pattern from an earlier PWA project (chess-academy-dashboard), including its two hard-won fixes: manual SW registration (App Router has no `_document.js` for next-pwa's own auto-injection to patch) and a plain 512px `purpose:"any"` icon (Chrome's install prompt can silently never fire without one) |
| Reads | viem + event logs | No database of balances; the contracts are the source of truth |
| Keeper + alerts | One standing Node process on **Nimsara's own Hetzner VPS**, watching vault events and calling `process()`/`settle()`, plus a Telegram bot on the same events | Vercel's free cron only runs once a day (checked 27 Sep 2026), and its per-minute Pro tier is $20/month for something a VPS already does for free, continuously. Telegram is where these users already are |
| Hosting | Vercel | Fast deploys, preview URLs, custom domain |
| Tests | Foundry: unit, fuzz and invariant tests; Slither | The invariants in CONTRACTS.md are the spec |

## Why one vault per user

- **Bugs can't leak between people.** A vault only ever holds one person's money, so accounting mistakes can't touch someone else's.
- **Non-custodial you can check.** "Your savings sit at your own address that only you can withdraw from" is visible on Arbiscan. A shared contract with a ledger is one pool that a single bug could drain, and it looks like custody.
- **Simpler code and tests.** No per-user tables. The per-vault invariants are easy to state.
- **It replaces the separate deposit forwarder.** The vault address is the deposit address.

Costs of the choice:

- A bug in the shared implementation is a bug in every vault. There is no upgrade path, so a fix means a new factory and a migration.
- More contracts to write and test: vault, factory and pool.
- The pool must only lend to vaults the factory really made, or someone could invent a fake vault and borrow. It checks `factory.isVault`.
- On default the pool needs a narrow path to take what is owed from a vault. `releaseToPool` is callable only by the pool, only after day 90, and only up to what is owed.
- Money arrives first and is split when `process()` is called. A keeper makes it near-instant, but it is not literally atomic.
- Clones initialise through a function, not a constructor. `initialize` must run once, in the same transaction as creation, and the implementation itself must be locked.

**Clones or full copies?** Clones cost roughly 150,000 to 250,000 gas to create (my estimate, to be measured with Foundry), against perhaps 1 to 2 million for a full copy. We chose clones and describe them honestly: immutable clones of fixed code, no upgrade path.

## Costs to plan for

*Checked on ZeroDev's pricing page on 26 Sep 2026. Verify before paying.*

| Item | Testnet | Mainnet |
|---|---|---|
| ZeroDev plan | **Sandbox: free**, 10,000 credits, testnets only | **Launch: $69/month**, 100,000 credits, mainnet gas sponsorship |
| Gas sponsorship | included, 8% premium on gas | same |
| Credits | 10 per wallet signature, 20 per bundled user operation | same |
| Making a user's vault | test ETH | a few cents (estimate), sponsored |

- Nothing is sponsored until a **gas policy** is set in the ZeroDev dashboard.
- The real cost is the $69 a month for mainnet, not the gas.
- ZeroDev also supports paying gas in ERC-20 tokens. Not yet checked whether the free plan allows it.
- The advance pool is a separate cost: the builder's own capital.

## Passkeys, practically

- Passkeys are WebAuthn, so they need **HTTPS and a stable domain**. A passkey created on a Vercel preview URL will not work on keepyours.xyz, so **the domain is attached to Vercel before anyone creates a passkey.** Today `keepyours.xyz` is not attached.
- **First open** creates the passkey (one Face ID prompt), which creates the wallet. **Every later open** is a single "Unlock" button. There is no email or password.
- **In-app browsers** (Telegram, X) often fail to create passkeys. The app detects them and shows "open in Safari/Chrome".
- Fallback path: "I have a wallet" (injected or WalletConnect).
- **Lost devices:** a user who loses every device with the passkey has no recovery. The app tells them to add a second passkey (another device) during setup, and the optional guardian can help with a stuck withdrawal. We cannot reset a passkey, and we say so.
- **Later:** Privy sign-in (email or Google) for people who want recovery. It puts a provider in the signing path, so it is offered as a choice, never forced.

## PWA only

The app is meant to be used as an installed PWA on a phone.

- **Detect** the installed state: `display-mode: standalone`, plus `navigator.standalone` on iOS.
- **Installed:** show the app.
- **Mobile browser tab:** an install screen with steps for the platform. Android/Chrome uses the install prompt; iOS uses Share, then Add to Home Screen (there is no prompt on iOS).
- **Desktop:** a gate page with a phone-shaped preview, a QR code and the install steps.
- **Reviewers:** a small "continue in browser (demo)" link, so judges opening the link on a laptop still see the product. A hard block is possible if we decide it is worth the risk.
- The waitlist page stays at `/`. The app lives under its own path, with the manifest `start_url` pointing at it.
- To check on a real iPhone: passkeys created in Safari must also work in the installed app.

## Environments

| | Testnet | Mainnet |
|---|---|---|
| Chain | Arbitrum Sepolia | Arbitrum One |
| USDC | Circle faucet test USDC | Native USDC |
| Who | Club members testing | Me, plus capped pilot users |
| Cap | none | $200 of `saved` per vault |
| Advance pool | test USDC | a few tens of dollars, the builder's own |

## What is deliberately not here

No backend database of user funds, no custody, no admin keys, no shared pool of savings, no off-chain matching engine. If our frontend disappears, the vault still works and the contracts are open, so any app can talk to it. **Correction (27 Sep):** a passkey smart account cannot sign from Arbiscan's Write Contract page, so "withdraw straight from Arbiscan" only holds for a user whose owner is a normal wallet. The planned answer for passkey users is a small standalone **emergency page** in the repo that anyone can host, which builds the passkey signature and calls `requestWithdraw` and `executeWithdraw`. It does not exist yet.
