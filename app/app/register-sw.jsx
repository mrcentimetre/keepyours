"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not fatal: the app still works, it just won't be installable
      // until this succeeds (e.g. blocked in a private window).
    });
  }, []);

  return null;
}
