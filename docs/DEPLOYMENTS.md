# Deployments

## Arbitrum Sepolia (30 Sep 2026)

Testnet only. Short timings so the whole flow can be shown in minutes.

| Contract | Address |
|---|---|
| `AdvancePool` | [`0x2BF7adE95B4Cc9ca9f933009F68A57e240A3eFb0`](https://sepolia.arbiscan.io/address/0x2BF7adE95B4Cc9ca9f933009F68A57e240A3eFb0) |
| `KeepVault` (implementation) | [`0x20DDc133acE9fCc23c1013c7e8b5e3D8712c4a66`](https://sepolia.arbiscan.io/address/0x20DDc133acE9fCc23c1013c7e8b5e3D8712c4a66) |
| `KeepVaultFactory` | [`0x24bEaAdC028D53f186521966BfbB4aaB8D1c40Ca`](https://sepolia.arbiscan.io/address/0x24bEaAdC028D53f186521966BfbB4aaB8D1c40Ca) |
| USDC (Circle test token) | [`0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`](https://sepolia.arbiscan.io/address/0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d) |

| Setting | Value |
|---|---|
| Deposit cap per vault | 200 USDC |
| Shortest waiting period a vault may pick | 5 minutes (mainnet: 1 day) |
| Fee tier length | 10 minutes: free, then 1.5%, then 3%; settle after 30 minutes (mainnet: 30 days) |
| Pool seeded with | 20 test USDC |
| Deployer | `0x773F340B265E66eCB3270a42C59b5976CD479EB8` (testnet-only key) |

Redeploy: fill `contracts/.env` (see `.env.example`), then

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url arbitrum_sepolia            # dry run
forge script script/Deploy.s.sol --rpc-url arbitrum_sepolia --broadcast --verify
```

Copy the printed addresses into `.env.local` (`NEXT_PUBLIC_FACTORY`, `NEXT_PUBLIC_POOL`, `NEXT_PUBLIC_USDC`) and into Vercel.
