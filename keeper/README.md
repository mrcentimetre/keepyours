# Keeper

A small Node service for the VPS. Every 15 seconds it:

1. finds every vault the factory has made,
2. calls `process()` on vaults holding unsplit USDC, so payments split even when nobody has the app open,
3. calls `settle()` on advances past their third fee period,
4. sends a **web push** for every new on-chain event on a vault with a registered phone, so notifications arrive with the app closed,
5. with `TELEGRAM_BOT_TOKEN` set, runs the Telegram bot: people connect from Settings → Telegram alerts, then get the same alerts in Telegram, plus `/status` and `/stop`.

It also serves `POST /subscribe` (used by the app's `/api/push` route on Vercel, guarded by a shared secret) and `GET /health`.

Its key only pays gas. `process()` and `settle()` are open to anyone and can only do what the contracts allow, so the key cannot move anyone's savings. State (last block, vaults, push subscriptions) lives in `data/state.json`.

## Run it

```bash
cd keeper
npm install
cp .env.example .env   # fill it in; never commit it
npm start
```

Node 22 or later (it uses `--env-file`).

## On the VPS (systemd)

```ini
# /etc/systemd/system/keepyours-keeper.service
[Unit]
Description=Keep Yours keeper
After=network-online.target

[Service]
WorkingDirectory=/opt/keepyours/keeper
ExecStart=/usr/bin/node --env-file=.env index.mjs
Restart=always
RestartSec=5
User=keeper

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now keepyours-keeper
journalctl -u keepyours-keeper -f
```

Open port `8787` to Vercel only if you can, or put it behind Caddy with HTTPS and use that URL.

## Vercel

| Variable | Value |
|---|---|
| `KEEPER_URL` | `http://<vps-ip>:8787` (or the HTTPS URL) |
| `KEEPER_SECRET` | same as `KEEPER_SECRET` in `keeper/.env` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | same as `VAPID_PUBLIC_KEY` in `keeper/.env` |

Redeploy after adding them: the public key is built into the app.
