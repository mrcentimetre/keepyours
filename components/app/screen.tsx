import * as React from "react";
import BoringAvatar from "boring-avatars";
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
        "flex min-h-dvh flex-col gap-6 bg-background px-5 pt-[calc(env(safe-area-inset-top)+18px)] pb-6",
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

// Brand greens plus a teal for variety — no amber (that means "waiting")
// or red ("blocked") in something purely decorative.
const AVATAR_COLORS = ["#0d4429", "#16b862", "#62e6a0", "#2cc7b0", "#eaf5ef"];

/**
 * The wallet's picture. Until a wallet has something of its own to show
 * (an NFT, say), it gets a generated "boring avatar" — the same address
 * always draws the same one. Generated locally by the boring-avatars
 * package, not boringavatars.com's image URL: that would send every
 * user's wallet address to a third-party server on every screen load.
 */
function WalletAvatar({ address, size = 40 }: { address: string | null; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 overflow-hidden rounded-full ring-2 ring-white/20"
      style={{ width: size, height: size }}
    >
      <BoringAvatar name={address ?? "keep-yours"} variant="beam" colors={AVATAR_COLORS} size={size} />
    </span>
  );
}

export { Screen, ScreenHeader, SectionLabel, Money, WalletAvatar };
