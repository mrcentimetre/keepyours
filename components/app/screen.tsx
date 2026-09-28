import * as React from "react";
import { cn } from "@/lib/utils";
import { splitUsdc } from "@/lib/format";

/**
 * A tab screen's body. The top padding clears the status bar: the installed
 * app declares `black-translucent` (app/app/layout.tsx), so the page draws
 * UNDER the clock and notch, and plain p-6 put every header behind them.
 */
function Screen({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <main
      className={cn(
        "flex min-h-dvh flex-col gap-6 px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-6 duration-300 animate-in fade-in slide-in-from-bottom-1",
        className
      )}
    >
      {children}
    </main>
  );
}

function ScreenHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] leading-[1.1] font-extrabold tracking-[-0.03em]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

/** Small, uppercase, tracked — names a section without shouting. */
function SectionLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <p className={cn("text-[10.5px] font-bold tracking-[0.12em] text-muted-foreground uppercase", className)}>
      {children}
    </p>
  );
}

/** A dollar amount with the cents set smaller and dimmer — how every
 * serious money app sets a balance. Tabular figures so digits don't jump
 * as the number changes. */
function Money({
  value,
  className,
  centsClassName,
}: {
  value: number;
  className?: string;
  centsClassName?: string;
}) {
  const { whole, cents } = splitUsdc(value);
  return (
    <span className={cn("font-mono tracking-[-0.03em] tabular-nums", className)}>
      ${whole}
      <span className={cn("opacity-50", centsClassName)}>.{cents}</span>
    </span>
  );
}

/** A deterministic gradient avatar from the wallet address — the same
 * address always gets the same colours, kept in the brand's green-teal
 * range so it never clashes. No initials: there's no name to take them from. */
function WalletAvatar({ address, size = 40 }: { address: string | null; size?: number }) {
  const seed = address ? parseInt(address.slice(2, 10), 16) || 0 : 0;
  const h1 = 135 + (seed % 30);
  const h2 = 145 + ((seed >> 8) % 30);
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full ring-2 ring-white/20"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(from ${seed % 360}deg, hsl(${h1} 70% 45%), hsl(${h2} 75% 62%), hsl(${h1} 70% 45%))`,
      }}
    />
  );
}

export { Screen, ScreenHeader, SectionLabel, Money, WalletAvatar };
