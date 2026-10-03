import { cn } from "@/lib/utils";

/**
 * The app's "working on it" mark: a coin flipping, in the current text colour,
 * so it fits on a green button as well as a dark one. Replaces the generic
 * spinner. The flip lives in globals.css (.ky-busy-coin).
 */
export function BusyCoin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("ky-busy-coin size-[18px] shrink-0", className)}>
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.9" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.4" />
      <ellipse cx="9.4" cy="9" rx="2.6" ry="1.4" fill="#ffffff" opacity="0.45" />
    </svg>
  );
}
