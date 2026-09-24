"use client";

import { useState } from "react";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState(null); // {text, ok}

  async function onSubmit(e) {
    e.preventDefault();
    const value = email.trim();

    if (!EMAIL.test(value)) {
      setMsg({ text: "That email looks off. Check it and try again.", ok: false });
      return;
    }

    setBusy(true);
    try {
      // Posted to our own route, which forwards it server-side. No CORS, and
      // the sheet endpoint never appears in the page source.
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, source: "keepyours.xyz" }),
      });
      if (!res.ok) throw new Error("bad response");
      setDone(true);
      setMsg({ text: "You're on the list. I'll email you once, when it opens.", ok: true });
    } catch {
      setMsg({ text: "That didn't save. Try again, or DM @keepyours on X.", ok: false });
      setBusy(false);
    }
  }

  return (
    <>
      {!done && (
        <form onSubmit={onSubmit} noValidate>
          <input
            type="email"
            name="email"
            placeholder="you@email.com"
            autoComplete="email"
            aria-label="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Get early access"}
          </button>
        </form>
      )}

      {msg && (
        <div className={"msg " + (msg.ok ? "ok" : "err")} role="status" aria-live="polite">
          {msg.text}
        </div>
      )}

      <p className="note">Non-custodial. Your keys, your savings.</p>
    </>
  );
}
