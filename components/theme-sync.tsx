"use client";

import { useEffect } from "react";
import { applyTheme, getThemeChoice } from "@/lib/theme";

/** With Appearance on "Auto", follow the phone switching light/dark while the app is open. */
export default function ThemeSync() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      if (getThemeChoice() === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return null;
}
