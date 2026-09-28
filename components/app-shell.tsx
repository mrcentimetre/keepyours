"use client";

import { usePathname } from "next/navigation";
import BottomNav from "./bottom-nav";

// Only the four tab-bar screens get the nav — not the install gate, wallet
// gate, or setup, which are one-time/gated flows that shouldn't look like
// a tab you can casually switch away from and back to.
const NAV_ROUTES = ["/app/home", "/app/withdraw", "/app/advance", "/app/settings"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = NAV_ROUTES.includes(pathname ?? "");

  return (
    <>
      {/* A phone app stays a phone-width column on anything wider, rather
          than stretching — a 1200px-wide keypad is most of what made the
          desktop "continue in browser" view look unfinished. */}
      <div
        className="mx-auto w-full max-w-[460px]"
        style={showNav ? { paddingBottom: "calc(env(safe-area-inset-bottom) + 96px)" } : undefined}
      >
        {children}
      </div>
      {showNav && <BottomNav />}
    </>
  );
}
