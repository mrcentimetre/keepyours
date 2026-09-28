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
      className="fixed inset-x-0 bottom-0 z-20 border-t border-[#1E3428] bg-[#0A160F]/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-[480px] items-center justify-around px-2 py-2">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 rounded-xl px-4 py-1.5"
            >
              <Icon active={active} />
              <span className={`text-[11px] ${active ? "text-[#62E6A0]" : "text-[#8CA497]"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
