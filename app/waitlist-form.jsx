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
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex gap-2 rounded-full border border-line bg-white p-1.5 shadow-[inset_0_1px_2px_rgba(8,45,28,0.04)] max-[480px]:flex-col max-[480px]:rounded-[22px]"
        >
          {/* 16px minimum: iOS Safari zooms the page on focus for any smaller input */}
          <input
            type="email"
            name="email"
            placeholder="you@email.com"
            autoComplete="email"
            aria-label="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-base text-ink outline-none placeholder:text-[#93aa9e] max-[480px]:py-3.5 max-[480px]:text-center"
          />
          <button
            type="submit"
            disabled={busy}
            className="cursor-pointer rounded-full border-0 bg-linear-[120deg] from-green to-mint px-[22px] py-3 text-[15px] font-semibold whitespace-nowrap text-[#03170c] shadow-[0_8px_18px_-8px_rgba(22,184,98,0.9)] transition hover:-translate-y-px hover:shadow-[0_12px_22px_-10px_rgb(22,184,98)] disabled:translate-y-0 disabled:cursor-default disabled:opacity-60 max-[480px]:py-3.5"
          >
            {busy ? "Saving…" : "Get early access"}
          </button>
        </form>
      )}

      {msg && (
        <div
          role="status"
          aria-live="polite"
          className={
            "mt-3.5 text-sm " + (msg.ok ? "font-medium text-green-deep" : "text-[#b23a3a]")
          }
        >
          {msg.text}
        </div>
      )}

      <p className="m-0 mt-[22px] mb-0.5 text-[12.5px] leading-normal text-muted">
        Non-custodial. Your keys, your savings.
      </p>
    </>
  );
}
