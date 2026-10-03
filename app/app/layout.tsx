import type { Metadata, Viewport } from "next";
import Analytics from "@/components/analytics";
import { Toaster } from "sonner";
import RegisterSW from "@/components/register-sw";
import AppShell from "@/components/app-shell";
import NoZoom from "@/components/no-zoom";
import ThemeSync from "@/components/theme-sync";
import { THEME_SCRIPT } from "@/lib/theme";

// The product app defaults to the dark "Night" theme, with Light as a
// choice in Settings (lib/theme.ts). The .ky-app class (app/globals.css)
// carries its own --background/--card/--primary/... tokens, separate from
// the waitlist's @theme block at /.
export const viewport: Viewport = {
  themeColor: "#060E0A",
  viewportFit: "cover",
  // An app, not a document — no pinch-zoom. See components/no-zoom.tsx for
  // why this alone isn't enough on iOS.
  maximumScale: 1,
  userScalable: false,
};

// `theme-color` alone (above) only tints the browser chrome in a regular
// tab. An iOS PWA installed via "Add to Home Screen" ignores it entirely
// for the status-bar area — that's controlled by this apple-specific meta,
// which Next.js only emits when told to. Without it, the installed app
// showed a plain white bar behind the clock/battery no matter what
// theme-color said. "black-translucent" draws our own dark background
// under the status bar instead, which is what makes it feel like a native
// app rather than a website in a frame.
export const metadata: Metadata = {
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Keep Yours",
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ky-app min-h-dvh bg-background font-sans text-foreground antialiased">
      {/* Before anything paints: apply the saved Light/Dark choice. */}
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <RegisterSW />
      <NoZoom />
      <ThemeSync />
      <Analytics />
      <AppShell>{children}</AppShell>
      {/* Toasts as a small pill that drops in under the notch / Dynamic
          Island — not a full-width box drawn over the clock. Unstyled, so
          sonner's own card look doesn't fight ours; `!` because sonner's
          CSS isn't in a Tailwind layer and would otherwise win. */}
      <Toaster
        position="top-center"
        duration={2200}
        gap={8}
        offset={{ top: "calc(env(safe-area-inset-top) + 10px)" }}
        mobileOffset={{ top: "calc(env(safe-area-inset-top) + 10px)", left: 0, right: 0 }}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              "left-0! right-0! mx-auto! w-fit! max-w-[calc(100vw-32px)] flex items-center gap-2.5 rounded-full bg-popover/90 py-2.5 pr-4 pl-3 text-[14px] font-semibold text-popover-foreground shadow-float ring-1 ring-hairline backdrop-blur-xl",
            icon: "m-0! size-5! flex items-center justify-center",
            success: "[&_[data-icon]]:text-primary",
            error: "[&_[data-icon]]:text-destructive",
            warning: "[&_[data-icon]]:text-warning",
            description: "text-[12px] font-normal text-muted-foreground",
          },
        }}
      />
    </div>
  );
}
