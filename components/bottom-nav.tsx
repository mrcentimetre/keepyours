"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, WithdrawIcon, AdvanceIcon, SettingsIcon } from "./icons";

const TABS = [
  { href: "/app/home", label: "Home", Icon: HomeIcon },
  { href: "/app/withdraw", label: "Withdraw", Icon: WithdrawIcon },
  { href: "/app/advance", label: "Advance", Icon: AdvanceIcon },
  { href: "/app/settings", label: "Settings", Icon: SettingsIcon },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/80 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-[480px] items-center justify-around px-2 py-2">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className="relative flex flex-col items-center gap-1 px-4 py-1.5">
              {active && (
                <span className="absolute -top-2 h-1 w-6 rounded-full bg-primary" aria-hidden="true" />
              )}
              <Icon active={active} />
              <span className={`text-[11px] transition-colors ${active ? "font-medium text-primary" : "text-muted-foreground"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
