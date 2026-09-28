"use client";

import { Check, Delete } from "lucide-react";
import { cn } from "@/lib/utils";

export type AmountPreset = { label: string; value: number };

const MAX_WHOLE_DIGITS = 7; // $9,999,999 — past the ~$200 vault cap by a mile

/** Pure key → next-value step, kept separate from the component so the
 * edge cases (one decimal point, cents only, leading zero) are testable. */
export function applyKey(value: string, key: string): string {
  if (key === "00") return applyKey(applyKey(value, "0"), "0");
  if (key === ".") {
    if (value.includes(".")) return value;
    return value === "" ? "0." : value + ".";
  }
  const [whole, decimals] = value.split(".");
  if (decimals !== undefined && decimals.length >= 2) return value; // cents only
  if (decimals === undefined && whole.length >= MAX_WHOLE_DIGITS) return value;
  if (value === "0") return key; // "05" → "5"
  return value + key;
}

/**
 * The big entered amount: whole part bright, a blinking cursor, and the
 * cents still to be typed shown dimmed — "$786.|00" — so it's always obvious
 * what the next key will do.
 */
export function AmountDisplay({ value, invalid }: { value: string; invalid?: boolean }) {
  const [whole, decimals] = value.split(".");
  const wholeShown = Number(whole || "0").toLocaleString("en-US");
  const typedCents = decimals ?? "";
  const pendingCents = "00".slice(typedCents.length);
  const long = wholeShown.length > 6;

  return (
    <p
      aria-live="polite"
      aria-label={`Amount ${value || "0"} dollars`}
      className={cn(
        "flex items-baseline justify-center font-mono font-semibold tracking-[-0.04em] tabular-nums transition-colors",
        long ? "text-[40px]" : "text-[56px]",
        invalid ? "text-destructive" : "text-foreground"
      )}
    >
      <span className="mr-0.5 text-[0.6em] opacity-60">$</span>
      {wholeShown}
      {decimals === undefined && (
        <span className="mx-0.5 h-[0.8em] w-[3px] self-center animate-pulse rounded-full bg-primary" aria-hidden="true" />
      )}
      <span className={decimals === undefined ? "opacity-30" : ""}>.</span>
      {typedCents}
      {decimals !== undefined && (
        <span className="mx-0.5 h-[0.8em] w-[3px] self-center animate-pulse rounded-full bg-primary" aria-hidden="true" />
      )}
      <span className="opacity-30">{pendingCents}</span>
    </p>
  );
}

export function AmountPresets({
  presets,
  value,
  onPick,
}: {
  presets: AmountPreset[];
  value: string;
  onPick: (value: string) => void;
}) {
  if (presets.length === 0) return null;
  return (
    <div className="flex justify-center gap-2">
      {presets.map((p) => {
        const active = Number(value) === p.value && value !== "";
        return (
          <button
            key={p.label}
            type="button"
            onClick={() => onPick(String(p.value))}
            className={cn(
              "h-9 rounded-full px-4 text-[13px] font-semibold transition-all active:scale-95",
              active ? "bg-primary text-primary-foreground" : "bg-surface-2 text-foreground/85 hover:bg-secondary"
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

const KEY = "flex h-[58px] items-center justify-center rounded-[18px] text-[22px] font-semibold transition-all duration-100 active:scale-[0.94] select-none";

export default function AmountKeypad({
  value,
  onChange,
  onConfirm,
  confirmDisabled,
  confirmLabel = "Continue",
}: {
  value: string;
  onChange: (next: string) => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  confirmLabel?: string;
}) {
  const digit = (k: string) => (
    <button
      key={k}
      type="button"
      onClick={() => onChange(applyKey(value, k))}
      className={cn(KEY, "bg-surface-2 font-mono text-foreground active:bg-secondary")}
    >
      {k}
    </button>
  );

  return (
    <div className="grid grid-cols-4 gap-2.5">
      {digit("1")}
      {digit("2")}
      {digit("3")}
      <button
        type="button"
        onClick={() => onChange(value.slice(0, -1))}
        aria-label="Backspace"
        className={cn(KEY, "bg-destructive/85 text-[#2a0b0b] active:bg-destructive")}
      >
        <Delete className="size-6" />
      </button>

      {digit("4")}
      {digit("5")}
      {digit("6")}
      <button
        type="button"
        onClick={() => onChange("")}
        aria-label="Clear"
        className={cn(KEY, "bg-secondary text-[18px] text-foreground active:bg-surface-2")}
      >
        C
      </button>

      {digit("7")}
      {digit("8")}
      {digit("9")}
      <button
        type="button"
        onClick={onConfirm}
        disabled={confirmDisabled}
        aria-label={confirmLabel}
        className={cn(
          KEY,
          "row-span-2 h-auto bg-gradient-to-b from-accent to-primary text-primary-foreground shadow-brand disabled:opacity-35 disabled:shadow-none"
        )}
      >
        <Check className="size-7" strokeWidth={2.75} />
      </button>

      {digit(".")}
      {digit("0")}
      {digit("00")}
    </div>
  );
}
