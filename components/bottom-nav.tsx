"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ArrowUpFromLine, Zap, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/app/home", label: "Home", Icon: House },
  { href: "/app/withdraw", label: "Withdraw", Icon: ArrowUpFromLine },
  { href: "/app/advance", label: "Advance", Icon: Zap },
  { href: "/app/settings", label: "Settings", Icon: Settings },
] as const;

/**
 * A floating dock, not a full-width bar. Inactive tabs are icon-only; the
 * active one widens into a green pill and shows its label — the current tab
 * is unmistakable without a thin underline, and it leaves room to grow.
 */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-3 z-30 mx-auto flex max-w-[436px] items-center gap-1 rounded-[24px] bg-dock p-2 shadow-float ring-1 ring-hairline backdrop-blur-xl"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            className={cn(
              "flex min-h-12 items-center justify-center gap-2 rounded-full px-4 transition-all duration-300 ease-out",
              active
                ? "flex-[1_1_auto] bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-brand"
                : "flex-[0_0_auto] text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-[21px]" strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
            <span
              className={cn(
                "overflow-hidden text-[13px] font-bold whitespace-nowrap transition-all duration-300",
                active ? "max-w-[110px] opacity-100" : "max-w-0 opacity-0"
              )}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
