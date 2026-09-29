import type { Metadata, Viewport } from "next";
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
      <AppShell>{children}</AppShell>
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          },
        }}
      />
    </div>
  );
}
