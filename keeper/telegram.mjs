// Telegram alerts for Keep Yours vaults. Long-polls the Bot API (no webhook,
// so the VPS needs no domain or HTTPS). People connect from the app: it asks
// the keeper for a one-time code and opens t.me/<bot>?start=<code>; the bot
// links that chat to the vault. Vault activity is public on-chain, so a link
// only ever reveals what anyone could already read on Arbiscan.

import { randomBytes } from "node:crypto";

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_CHATS_PER_VAULT = 3;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * @param opts.token      bot token from @BotFather
 * @param opts.state      the keeper's persisted state (gets a `tg` section)
 * @param opts.save       persists state
 * @param opts.log        logger
 * @param opts.status     async (vault) => lines of text for /status
 * @param opts.txUrl      (hash) => explorer link
 */
export function createTelegram({ token, state, save, log, status, txUrl }) {
  state.tg ??= { links: {}, codes: {}, offset: 0 };
  const tg = state.tg;
  const api = async (method, body) => {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(method === "getUpdates" ? 40_000 : 10_000),
    });
    const json = await res.json();
    if (!json.ok) throw Object.assign(new Error(json.description ?? "telegram error"), { code: json.error_code });
    return json.result;
  };
  let username = null;

  const say = (chat, html) =>
    api("sendMessage", { chat_id: chat, text: html, parse_mode: "HTML", link_preview_options: { is_disabled: true } });

  function vaultsOf(chat) {
    return Object.keys(tg.links).filter((v) => tg.links[v].includes(chat));
  }

  async function onMessage(msg) {
    const chat = msg.chat?.id;
    const text = (msg.text ?? "").trim();
    if (!chat || msg.chat.type !== "private") return;
    const [cmd, arg] = text.split(/\s+/, 2);

    if (cmd === "/start" && arg) {
      const entry = tg.codes[arg];
      delete tg.codes[arg];
      if (!entry || entry.exp < Date.now()) {
        save();
        return say(chat, "That link has expired. Open Keep Yours → Settings → <b>Telegram alerts</b> and tap Connect again.");
      }
      const list = (tg.links[entry.vault] ?? []).filter((c) => c !== chat);
      tg.links[entry.vault] = [...list, chat].slice(-MAX_CHATS_PER_VAULT);
      save();
      log(`telegram connected for ${entry.vault}`);
      return say(
        chat,
        "<b>Connected ✅</b>\nYou'll get a message here for every payment, advance, withdrawal and settings change on your Keep Yours vault.\n\n/status · balances and anything waiting\n/stop · stop these alerts"
      );
    }
    if (cmd === "/start") {
      return say(chat, "Hi! To get alerts here, open Keep Yours → Settings → <b>Telegram alerts</b> and tap Connect.");
    }
    if (cmd === "/stop") {
      for (const v of vaultsOf(chat)) tg.links[v] = tg.links[v].filter((c) => c !== chat);
      save();
      return say(chat, "Alerts stopped. Connect again any time from Settings in the app.");
    }
    if (cmd === "/status") {
      const vaults = vaultsOf(chat);
      if (!vaults.length) return say(chat, "No vault connected yet. Open Keep Yours → Settings → <b>Telegram alerts</b>.");
      const parts = [];
      for (const v of vaults) parts.push((await status(v)).join("\n"));
      return say(chat, parts.join("\n\n"));
    }
    return say(chat, "/status · balances and anything waiting\n/stop · stop these alerts");
  }

  async function poll() {
    for (;;) {
      try {
        const updates = await api("getUpdates", { offset: tg.offset, timeout: 30, allowed_updates: ["message"] });
        for (const u of updates) {
          tg.offset = u.update_id + 1;
          if (u.message) await onMessage(u.message).catch((e) => log("telegram reply failed:", e.message));
        }
        if (updates.length) save();
      } catch (e) {
        log("telegram poll failed:", e.message);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  return {
    async start() {
      const me = await api("getMe");
      username = me.username;
      await api("setMyCommands", {
        commands: [
          { command: "status", description: "Balances and anything waiting" },
          { command: "stop", description: "Stop these alerts" },
        ],
      });
      log(`telegram bot @${username} ready`);
      poll();
    },
    get username() {
      return username;
    },
    /** A one-time code for the app's Connect button. */
    linkCode(vault) {
      const now = Date.now();
      for (const [c, e] of Object.entries(tg.codes)) if (e.exp < now) delete tg.codes[c];
      const code = randomBytes(9).toString("base64url");
      tg.codes[code] = { vault, exp: now + CODE_TTL_MS };
      save();
      return code;
    },
    linked(vault) {
      return (tg.links[vault]?.length ?? 0) > 0;
    },
    watched() {
      return Object.keys(tg.links).filter((v) => tg.links[v].length);
    },
    /** One event to every chat linked to its vault. */
    async notify(vault, { title, body }, tx) {
      for (const chat of tg.links[vault] ?? []) {
        try {
          await say(chat, `<b>${esc(title)}</b>\n${esc(body)}${tx ? `\n<a href="${txUrl(tx)}">View transaction</a>` : ""}`);
        } catch (e) {
          // 403: they blocked the bot. Drop the link.
          if (e.code === 403) {
            tg.links[vault] = tg.links[vault].filter((c) => c !== chat);
            log(`telegram chat blocked the bot, unlinked from ${vault}`);
          } else log("telegram send failed:", e.message);
        }
      }
    },
  };
}
