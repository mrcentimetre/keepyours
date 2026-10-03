"use client";

import type { ActivityItem, ActivityKind } from "@/lib/activity";
import { explorerTx } from "@/lib/usdc";
import { formatUsdc } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdvanceIcon, CooldownIcon, SplitIcon } from "./waitlist/feature-icons";
import {
  CancelledIcon,
  ReceivedIcon,
  RepaidIcon,
  SentIcon,
  SettledIcon,
  WithdrawnIcon,
} from "./app/activity-icons";

type Look = {
  title: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /** "in" is money arriving (shown in green with +), "out" money leaving (−), "move" neither. */
  flow: "in" | "out" | "move";
  subtitle: (i: ActivityItem) => string;
};

const $ = (n: number) => `$${formatUsdc(n)}`;

const LOOK: Record<ActivityKind, Look> = {
  payment: {
    title: "Payment",
    Icon: SplitIcon,
    flow: "in",
    subtitle: (i) =>
      i.repaid ? `Repaid ${$(i.repaid)} · kept ${$(i.kept ?? 0)}` : `Kept ${$(i.kept ?? 0)}`,
  },
  received: { title: "Into your wallet", Icon: ReceivedIcon, flow: "in", subtitle: () => "Not split" },
  sent: {
    title: "Sent",
    Icon: SentIcon,
    flow: "out",
    subtitle: (i) => (i.to ? `To ${i.to.slice(0, 6)}…${i.to.slice(-4)}` : "From your wallet"),
  },
  advance: { title: "Advance", Icon: AdvanceIcon, flow: "in", subtitle: () => "Into your wallet" },
  repaid: { title: "Advance repaid", Icon: RepaidIcon, flow: "out", subtitle: (i) => (i.detail === "no fee" ? "No fee" : "Fee included") },
  settled: { title: "Advance settled", Icon: SettledIcon, flow: "out", subtitle: () => "From savings, after day 90" },
  "withdraw-requested": { title: "Withdrawal started", Icon: CooldownIcon, flow: "move", subtitle: () => "Waiting period" },
  "withdraw-cancelled": { title: "Withdrawal cancelled", Icon: CancelledIcon, flow: "move", subtitle: () => "Stayed in savings" },
  withdrawn: { title: "Withdrawn", Icon: WithdrawnIcon, flow: "move", subtitle: () => "Savings to wallet" },
};

function dayLabel(at: number, now: number): string {
  const d = new Date(at);
  const today = new Date(now);
  const yesterday = new Date(now - 86_400_000);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const clock = (at: number) => new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** Activity grouped by day, newest first. Each row opens its transaction on Arbiscan. */
export default function ActivityList({
  items,
  now,
  unreadAfter,
  className,
}: {
  items: ActivityItem[];
  now: number;
  /** Items newer than this get an unread dot. */
  unreadAfter?: number;
  className?: string;
}) {
  const groups: { label: string; items: ActivityItem[] }[] = [];
  for (const i of items) {
    const label = dayLabel(i.at, now);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(i);
    else groups.push({ label, items: [i] });
  }

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {groups.map((g) => (
        <section key={g.label}>
          <h3 className="mb-1 text-[12px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">{g.label}</h3>
          <ul>
            {g.items.map((i) => {
              const look = LOOK[i.kind];
              const unread = unreadAfter !== undefined && i.at > unreadAfter;
              return (
                <li key={i.id}>
                  <a
                    href={explorerTx(i.tx)}
                    target="_blank"
                    rel="noreferrer"
                    className="-mx-2 flex items-center gap-3.5 rounded-2xl px-2 py-2.5 transition-colors active:bg-surface-2"
                  >
                    <span className="relative shrink-0">
                      <look.Icon className="ic-still size-11" />
                      {unread && (
                        <span className="absolute top-0 right-0 size-2.5 rounded-full bg-primary ring-2 ring-background" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{look.title}</span>
                      <span className="block truncate text-[13px] text-muted-foreground">{look.subtitle(i)}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span
                        className={cn(
                          "block font-mono text-[15px] font-semibold tabular-nums",
                          look.flow === "in" && "text-primary"
                        )}
                      >
                        {look.flow === "in" ? "+" : look.flow === "out" ? "−" : ""}
                        {$(i.amount)}
                      </span>
                      <span className="block text-[12px] text-muted-foreground tabular-nums">{clock(i.at)}</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
