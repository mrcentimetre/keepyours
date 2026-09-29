"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { NAME_MAX } from "@/lib/pass-params";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const HANDLE = /^[A-Za-z0-9_]{1,15}$/;

type Field = "email" | "name" | "handle" | "consent";
export type Joined = { name: string; handle: string };

const cleanHandle = (value: string) => value.trim().replace(/^@+/, "");

// A row that opens from zero height when `open` turns true.
function Reveal({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
      inert={!open}
    >
      {/* padding keeps the focus ring from being clipped */}
      <div className="-mx-1.5 -mb-1.5 min-h-0 overflow-hidden px-1.5 pb-1.5">{children}</div>
    </div>
  );
}

export default function WaitlistForm({ onJoined }: { onJoined: (who: Joined) => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [consent, setConsent] = useState(false);
  // 0: email only, 1: + handle, 2: + consent. Only ever grows.
  const [step, setStep] = useState(0);
  const [invalid, setInvalid] = useState<Field | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const reach = (n: number) => setStep((s) => Math.max(s, n));

  function fail(field: Field, text: string) {
    setInvalid(field);
    setMsg(text);
    reach(2);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();
    const who = name.trim();
    const x = cleanHandle(handle);

    if (!EMAIL.test(value)) return fail("email", "That email looks off. Check it and try again.");
    if (!who) return fail("name", "Add your name. It goes on your pass instead of your email.");
    if (!HANDLE.test(x)) return fail("handle", "Add your X handle, like @keepyoursxyz.");
    if (!consent) return fail("consent", "Tick the box so I can tag you at launch.");

    setInvalid(null);
    setMsg(null);
    setBusy(true);
    try {
      // Posted to our own route, which forwards it server-side. No CORS, and
      // the sheet endpoint never appears in the page source.
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, name: who, handle: x, consent: true, source: "keepyours.xyz" }),
      });
      if (!res.ok) throw new Error("bad response");
      // The pass gets the name, not the email — it's meant to be shared.
      onJoined({ name: who, handle: x });
    } catch {
      setMsg("That didn't save. Try again, or DM @keepyoursxyz on X.");
      setBusy(false);
    }
  }

  const field = (name: Field) =>
    "w-full rounded-full border bg-white px-5 py-3.5 text-base text-ink outline-none transition placeholder:text-[#93aa9e] focus:border-green focus:shadow-[0_0_0_4px_rgba(22,184,98,0.14)] " +
    (invalid === name ? "border-[#e06666]" : "border-line");

  const submit = (
    <button
      type="submit"
      disabled={busy}
      className={`cursor-pointer rounded-full border-0 bg-linear-[120deg] from-green to-mint px-[22px] text-[15px] font-semibold whitespace-nowrap text-[#03170c] shadow-[0_8px_18px_-8px_rgba(22,184,98,0.9)] transition hover:-translate-y-px hover:shadow-[0_12px_22px_-10px_rgb(22,184,98)] active:scale-[0.97] disabled:translate-y-0 disabled:scale-100 disabled:cursor-default disabled:opacity-60 ${
        step === 0 ? "py-3 max-[480px]:py-3.5" : "mt-3.5 py-3.5"
      }`}
    >
      {busy ? "Saving…" : "Get early access"}
    </button>
  );

  return (
    <>
      <h2 className="m-0 mb-1.5 font-display text-[19px] font-semibold">Join the waitlist</h2>
      <p className="m-0 mb-[22px] text-sm text-muted">
        Be one of the first testers. No spam, one email when it opens.
      </p>

      <form onSubmit={onSubmit} noValidate className="flex flex-col text-left">
        {/* Same one-row pill as before; the button drops below once the extra fields open. */}
        <div
          className={`flex gap-2 rounded-full border bg-white p-1.5 shadow-[inset_0_1px_2px_rgba(8,45,28,0.04)] transition focus-within:border-green focus-within:shadow-[0_0_0_4px_rgba(22,184,98,0.14)] max-[480px]:flex-col max-[480px]:rounded-[22px] ${
            invalid === "email" ? "border-[#e06666]" : "border-line"
          }`}
        >
          {/* 16px minimum: iOS Safari zooms the page on focus for any smaller input */}
          <input
            type="email"
            name="email"
            placeholder="you@email.com"
            autoComplete="email"
            aria-label="Your email"
            aria-invalid={invalid === "email"}
            value={email}
            onFocus={() => reach(1)}
            onChange={(e) => {
              setEmail(e.target.value);
              if (invalid === "email") setInvalid(null);
            }}
            className="min-w-0 flex-1 border-0 bg-transparent px-4 py-3 text-base text-ink outline-none placeholder:text-[#93aa9e] max-[480px]:py-3.5 max-[480px]:text-center"
          />
          {step === 0 && submit}
        </div>

        <Reveal open={step >= 1}>
          <div className="pt-2.5">
            <input
              type="text"
              name="name"
              placeholder="your name"
              autoComplete="name"
              maxLength={NAME_MAX}
              aria-label="Your name"
              aria-invalid={invalid === "name"}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (invalid === "name") setInvalid(null);
              }}
              className={field("name")}
            />
          </div>
          <div className="relative pt-2.5">
            <span className="pointer-events-none absolute top-[calc(50%+5px)] left-5 -translate-y-1/2 text-base text-muted">
              @
            </span>
            <input
              type="text"
              name="handle"
              placeholder="your X handle"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              aria-label="Your X handle"
              aria-invalid={invalid === "handle"}
              value={handle}
              onFocus={() => reach(2)}
              onChange={(e) => {
                setHandle(e.target.value.replace(/^@+/, ""));
                if (invalid === "handle") setInvalid(null);
              }}
              className={`${field("handle")} pl-9`}
            />
          </div>
        </Reveal>

        <Reveal open={step >= 2}>
          <label
            className={`flex cursor-pointer items-center gap-2.5 px-2 pt-3.5 text-[13px] ${
              invalid === "consent" ? "text-[#b23a3a]" : "text-ink-2"
            }`}
          >
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                if (invalid === "consent") setInvalid(null);
              }}
              className="size-4 shrink-0 cursor-pointer accent-green"
            />
            It&rsquo;s fine to tag me on X when Keep Yours launches.
          </label>
        </Reveal>

        {step > 0 && submit}
      </form>

      {msg && (
        <div role="status" aria-live="polite" className="mt-3.5 text-sm text-[#b23a3a]">
          {msg}
        </div>
      )}

      <p className="m-0 mt-[22px] mb-0.5 text-[12.5px] leading-normal text-muted">
        Non-custodial. Your keys, your savings.
      </p>
    </>
  );
}
