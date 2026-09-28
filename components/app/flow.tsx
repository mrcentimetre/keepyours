import * as React from "react";
import { cn } from "@/lib/utils";

/** The brand glow behind the one-off flow screens (onboarding, wallet,
 * setup, notices) — a soft green light from the top, so they don't sit on
 * flat black. Fixed, so it never scrolls away or runs out. */
function Glow({ tone = "brand" }: { tone?: "brand" | "warning" }) {
  const c = tone === "warning" ? "244,181,69" : "22,184,98";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[70dvh]"
      style={{
        background: `radial-gradient(70% 55% at 50% 0%, rgba(${c},0.28) 0%, rgba(${c},0.08) 45%, transparent 75%)`,
      }}
    />
  );
}

/** A full-height flow screen: clears the status bar and the home indicator,
 * content on top, actions pinned to the bottom. */
function FlowScreen({
  className,
  children,
  glow = "brand",
}: {
  className?: string;
  children: React.ReactNode;
  glow?: "brand" | "warning";
}) {
  return (
    <main
      className={cn(
        "relative flex min-h-dvh flex-col px-6 pt-[calc(env(safe-area-inset-top)+20px)] pb-[calc(env(safe-area-inset-bottom)+24px)] duration-300 animate-in fade-in",
        className
      )}
    >
      <Glow tone={glow} />
      <div className="relative flex flex-1 flex-col">{children}</div>
    </main>
  );
}

/** A large glowing icon medallion — the focal point of a flow screen. */
function IconOrb({
  children,
  tone = "brand",
  className,
}: {
  children: React.ReactNode;
  tone?: "brand" | "warning";
  className?: string;
}) {
  return (
    <div className={cn("relative flex size-28 items-center justify-center", className)}>
      <span
        aria-hidden="true"
        className={cn("absolute inset-0 rounded-full blur-2xl", tone === "warning" ? "bg-warning/30" : "bg-primary/35")}
      />
      <span
        className={cn(
          "relative flex size-24 items-center justify-center rounded-[30px] ring-1 ring-white/10 shadow-float",
          tone === "warning"
            ? "bg-gradient-to-br from-[#3a2c0f] to-[#1d1608] text-warning"
            : "bg-gradient-to-br from-[#16432b] to-[#0c2418] text-accent"
        )}
      >
        {children}
      </span>
    </div>
  );
}

function FlowTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <h1 className={cn("font-display text-[34px] leading-[1.05] font-extrabold tracking-[-0.035em]", className)}>
      {children}
    </h1>
  );
}

function FlowBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn("text-[15px] leading-relaxed text-muted-foreground", className)}>{children}</p>;
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-128.png" alt="" width={28} height={28} className="block" />
      <span className="font-display text-[15px] font-extrabold tracking-[-0.02em]">Keep Yours</span>
    </div>
  );
}

export { Glow, FlowScreen, IconOrb, FlowTitle, FlowBody, BrandMark };
