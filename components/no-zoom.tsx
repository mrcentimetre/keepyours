"use client";

import { useEffect } from "react";

/**
 * Blocks pinch-zoom in the app. Three layers, because iOS honours none of
 * them on its own everywhere: the viewport's user-scalable=no
 * (app/app/layout.tsx) is ignored by Safari since iOS 10; touch-action on
 * <html> (app/globals.css) stops most pinches; and Safari's own non-standard
 * gesture events, cancelled here, catch the rest.
 *
 * Text is sized for this (16px inputs, nothing below ~11px), so nobody
 * should need to zoom to read it.
 */
export default function NoZoom() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", stop, { passive: false });
    document.addEventListener("gesturechange", stop, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
    };
  }, []);
  return null;
}
