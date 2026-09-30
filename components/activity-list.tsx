"use client";

import { ArrowDownLeft, ArrowUpRight, Ban, Check, Lock, Timer, Undo2, Wallet, Zap } from "lucide-react";
import type { ActivityItem, ActivityKind } from "@/lib/activity";
import { explorerTx } from "@/lib/usdc";
import { formatUsdc, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardRows } from "./ui/card";

const LOOK: Record<ActivityKind, { title: string; icon: React.ReactNode; tone: string; sign: "+" | "-" | "" }> = {
  payment: { title: "Payment received", icon: <ArrowDownLeft />, tone: "bg-primary/12 text-primary", sign: "+" },
  received: { title: "Received in wallet", icon: <Wallet />, tone: "bg-accent/15 text-accent", sign: "+" },
  sent: { title: "Sent", icon: <ArrowUpRight />, tone: "bg-surface-2 text-foreground/80", sign: "-" },
  advance: { title: "Advance taken", icon: <Zap />, tone: "bg-primary/12 text-primary", sign: "+" },
  repaid: { title: "Advance repaid", icon: <Undo2 />, tone: "bg-surface-2 text-foreground/80", sign: "-" },
  settled: { title: "Advance settled from savings", icon: <Lock />, tone: "bg-warning/15 text-warning", sign: "-" },
  "withdraw-requested": { title: "Withdrawal requested", icon: <Timer />, tone: "bg-warning/15 text-warning", sign: "" },
  "withdraw-cancelled": { title: "Withdrawal cancelled", icon: <Ban />, tone: "bg-surface-2 text-foreground/80", sign: "" },
  withdrawn: { title: "Withdrawn to wallet", icon: <Check />, tone: "bg-primary/12 text-primary", sign: "" },
};

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
  return (
    <Card className={className}>
      <CardRows>
        {items.map((i) => {
          const look = LOOK[i.kind];
          const unread = unreadAfter !== undefined && i.at > unreadAfter;
          return (
            <a
              key={i.id}
              href={explorerTx(i.tx)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-surface-2"
            >
              <span
                className={cn(
                  "relative flex size-10 shrink-0 items-center justify-center rounded-full [&_svg]:size-5",
                  look.tone
                )}
              >
                {look.icon}
                {unread && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-primary ring-2 ring-card" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold">{look.title}</p>
                <p className="truncate text-[12px] text-muted-foreground">
                  {timeAgo(i.at, now)}
                  {i.detail ? ` · ${i.detail}` : ""}
                </p>
              </div>
              <p
                className={cn(
                  "font-mono text-[14px] font-semibold tabular-nums",
                  look.sign === "+" && "text-primary"
                )}
              >
                {look.sign}${formatUsdc(i.amount)}
              </p>
            </a>
          );
        })}
      </CardRows>
    </Card>
  );
}
