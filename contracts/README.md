# Contracts

Foundry project for `KeepVault`, `KeepVaultFactory` and `AdvancePool`. Design and the 11 invariants: [`../docs/CONTRACTS.md`](../docs/CONTRACTS.md). Test plan: [`../docs/TESTING.md`](../docs/TESTING.md). Deploy steps: [`../docs/RUNBOOK.md`](../docs/RUNBOOK.md).

```shell
forge build
forge test -vvv
forge fmt
```

**Foundry only auto-loads `contracts/.env`, never the repo-root one** — verified empirically, not documented clearly by Foundry itself. Copy the chain/deployment section of the repo-root `.env.example` into `contracts/.env` (gitignored, same rule as the root one). The Next.js app and the keeper each read their own env file from their own directory the same way; nothing is shared automatically.
