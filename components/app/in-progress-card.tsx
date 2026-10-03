import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatUsdc } from "@/lib/format";

/** "2h 14m", "9m", "3d 4h": how long is left, at a glance. */
export function humanDuration(ms: number): string {
  const m = Math.max(0, Math.ceil(ms / 60_000));
  if (m < 1) return "under a minute";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/**
 * Something running on the vault right now (a withdrawal waiting, an open
 * advance, a settings change): what it is, how much (or what), where it
 * stands, and how far along. With `href` the whole card opens that screen;
 * `children` (buttons) sit under the progress bar.
 */
export default function InProgressCard({
  href,
  Icon,
  label,
  amount,
  headline,
  status,
  sub,
  tone,
  progress,
  children,
}: {
  href?: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  /** Money, shown large. Or use `headline` for something that isn't an amount. */
  amount?: number;
  headline?: string;
  status: string;
  sub: string;
  /** Amber always means waiting; green means fine as it is. */
  tone: "primary" | "warning";
  progress: number;
  children?: React.ReactNode;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  const body = (
    <>
      <div className="flex items-center gap-3.5">
        <Icon className="size-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-muted-foreground">{label}</p>
          {amount !== undefined ? (
            <p className="font-mono text-[22px] leading-tight font-semibold tracking-[-0.02em] tabular-nums">
              ${formatUsdc(amount)}
            </p>
          ) : (
            <p className="text-[17px] leading-tight font-semibold tracking-[-0.01em]">{headline}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className={cn("text-[14px] font-semibold", tone === "warning" ? "text-warning" : "text-primary")}>{status}</p>
          <p className="text-[12px] text-muted-foreground">{sub}</p>
        </div>
      </div>
      <div
        className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${status}`}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-700", tone === "warning" ? "bg-warning" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
      {children && <div className="mt-4">{children}</div>}
    </>
  );
  const card = "block rounded-[22px] bg-card p-4 shadow-sm ring-1 ring-hairline";
  return href ? (
    <Link href={href} transitionTypes={["nav-forward"]} className={`${card} transition-transform active:scale-[0.99]`}>
      {body}
    </Link>
  ) : (
    <section className={card}>{body}</section>
  );
}
