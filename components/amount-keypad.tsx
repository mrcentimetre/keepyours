"use client";

import { BackspaceIcon } from "./icons";
import { Button } from "./ui/button";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"] as const;

export type AmountPreset = { label: string; value: number };

type AmountKeypadProps = {
  /** Raw digit-string amount, e.g. "15.5" — the screen owns this state, the
   * keypad only proposes the next value via onChange. Kept as a string
   * (not a number) so a trailing "." or "15.0" don't get silently eaten
   * while the person is still typing. */
  value: string;
  onChange: (next: string) => void;
  presets?: AmountPreset[];
  onConfirm: () => void;
  confirmDisabled?: boolean;
  confirmLabel?: string;
};

export default function AmountKeypad({
  value,
  onChange,
  presets,
  onConfirm,
  confirmDisabled,
  confirmLabel = "Confirm",
}: AmountKeypadProps) {
  function pressDigit(key: string) {
    if (key === ".") {
      if (value.includes(".")) return;
      onChange(value === "" ? "0." : value + ".");
      return;
    }
    const decimals = value.split(".")[1];
    if (decimals && decimals.length >= 2) return; // cents only, no more
    if (value === "0") {
      onChange(key);
      return;
    }
    onChange(value + key);
  }

  function backspace() {
    onChange(value.slice(0, -1));
  }

  return (
    <div className="flex flex-col gap-4">
      {presets && presets.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(String(p.value))}
              className="shrink-0 rounded-full border border-border bg-card px-4 py-1.5 text-[13px] text-foreground/80 transition-colors hover:border-secondary active:scale-95"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k) =>
          k === "back" ? (
            <button
              key={k}
              type="button"
              onClick={backspace}
              aria-label="Backspace"
              className="flex items-center justify-center rounded-2xl bg-card py-4 text-destructive transition-colors active:scale-95 active:bg-secondary"
            >
              <BackspaceIcon />
            </button>
          ) : (
            <button
              key={k}
              type="button"
              onClick={() => pressDigit(k)}
              className="rounded-2xl bg-card py-4 font-mono text-[20px] text-foreground transition-colors active:scale-95 active:bg-secondary"
            >
              {k}
            </button>
          )
        )}
      </div>

      <Button onClick={onConfirm} disabled={confirmDisabled} className="w-full">
        {confirmLabel}
      </Button>
    </div>
  );
}
