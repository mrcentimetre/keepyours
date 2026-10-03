import { ViewTransition } from "react";

// Which animation a navigation plays, by the type its <Link> carries:
// nav-forward slides in from the right (going deeper), nav-back slides back,
// nav-tab crossfades (tab bar). Anything untyped (first load, browser back,
// refreshes) doesn't animate. CSS lives in globals.css under "page transitions".
const BY_TYPE = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  "nav-tab": "nav-tab",
  default: "none",
};

/** Wrap a page's content. Goes in each page.tsx, not a layout: layouts persist, so they never enter or exit. */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter={BY_TYPE} exit={BY_TYPE} default="none">
      {children}
    </ViewTransition>
  );
}
