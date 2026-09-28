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
      <div className={showNav ? "pb-20" : ""}>{children}</div>
      {showNav && <BottomNav />}
    </>
  );
}
