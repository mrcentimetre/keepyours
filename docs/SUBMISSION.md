# Submission scratchpad

Fill this in as you build. On submission day, copy from here rather than writing anything new.

Deadlines in Sri Lanka time: **Arbitrum 4 Oct, 21:29** · **Colosseum 13 Oct, ~12:29**. Submit a day early on both.

---

## Links (keep current)

| Thing | Link |
|---|---|
| Live app | https://keepyours.xyz |
| Repo | https://github.com/mrcentimetre/keepyours |
| Demo video | TBD |
| X | https://x.com/keepyoursxyz |
| Proposal / research page | https://claude.ai/artifact/9HeCdWLtQBJFMuN1TMJGUt |

## Contract addresses

Format the Arbitrum form wants, one per line:

```
Arbitrum One: 0x... — KeepVaultFactory, KeepVault (implementation), AdvancePool
Arbitrum Sepolia: 0x... — KeepVaultFactory, KeepVault (implementation), AdvancePool (testnet)
```

- Factory / pool contracts: `Arbitrum One: 0x... — Forwarder factory` (or N/A)
- Token contract: **N/A** (no token)

---

## Arbitrum form answers

**"Which parts of your code have been produced during the Buildathon?"** (max 300 characters)

> Everything in the repo. First commit 24 Sep 2026, inside the window. Only the user research and written proposal predate it, and none of that is code. Commit history shows contracts, tests, app and docs built day by day.

**Sponsor tech used** (tick what's true on the day):

- [ ] ZeroDev (passkey smart account + paymaster)
- [ ] Alchemy (RPC)
- [ ] OpenZeppelin (contracts)
- [ ] Robinhood Chain
- [ ] Dune Analytics
- [ ] GMX / Fhenix / AWS / Paxos-USDG

---

## Colosseum submission

**Track:** Arbitrum.

**Description** (aim for 500–1000 words; sections below):

1. **The problem** — three pains, with the quotes and numbers from the research.
2. **The solution** — the six features, in the order a user meets them.
3. **Why onchain** — a contract is the only thing that can hold you to a rule about money you still control.
4. **How it works** — a vault contract per user, a separate advance pool, passkey wallet, sponsored gas.
5. **Traction** — exactly what happened, no invention.
6. **Business model** — 15% of yield, advance fee after 30 free days (1.5%, then 3%), savings payroll for teams.
7. **What's next** — yield, cross-chain deposits via Daimo, guardian, more markets.

**Judging criteria to answer explicitly:** functionality, potential impact, novelty, UX, open-source, business plan.

---

## Traction, stated honestly

Fill in real numbers only:

- People interviewed: ___
- Testnet users: ___
- Mainnet users: ___
- Withdrawals cancelled during a cooldown: ___
- Advances taken and repaid: ___
- Waitlist sign-ups: ___

---

## Final checks before submitting

- [ ] Live URL opens in a private window on a phone
- [ ] Contract verified and readable on Arbiscan
- [ ] Repo public, README accurate, no secrets committed
- [ ] Demo video under 5 minutes, sound checked, links in the description
- [ ] Every link in the form opened and confirmed
- [ ] Screenshots attached where allowed
- [ ] Submitted a day early
