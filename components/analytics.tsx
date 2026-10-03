"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { startAnalytics, trackPage } from "@/lib/analytics";

/** Starts PostHog for the app and records each screen the tester opens. */
export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    startAnalytics();
  }, []);

  useEffect(() => {
    if (pathname) trackPage(pathname);
  }, [pathname]);

  return null;
}
