"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCachedAddress } from "@/hooks/use-passkey-wallet";
import { markHydrated } from "@/lib/hydrated";
import BottomNav from "./bottom-nav";

// Only the four tab-bar screens get the nav — not the install gate, wallet
// gate, or setup, which are one-time/gated flows that shouldn't look like
// a tab you can casually switch away from and back to.
const NAV_ROUTES = ["/app/home", "/app/withdraw", "/app/advance", "/app/settings"];
// Screens you step into from a tab (no tab bar of their own, a back button
// instead), which still need a signed-in wallet.
const SUB_ROUTES = ["/app/send"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const showNav = NAV_ROUTES.includes(pathname ?? "");

  // Signed out (no wallet on this phone): the tab screens have nothing to
  // show, so back to the sign-in gate — e.g. pressing Back after Sign out.
  // The shell mounts once per session: after this, screens render cached data at once.
  useEffect(() => markHydrated(), []);

  const needsWallet = showNav || SUB_ROUTES.includes(pathname ?? "");
  useEffect(() => {
    if (needsWallet && !getCachedAddress()) router.replace("/app");
  }, [needsWallet, router]);

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
