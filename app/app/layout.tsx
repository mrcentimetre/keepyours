import type { Metadata, Viewport } from "next";
import RegisterSW from "@/components/register-sw";
import AppShell from "@/components/app-shell";

// The product app is a dark, "Night" theme — different from the waitlist's
// light theme at /. Colours here are literal hex (CLAUDE.md's Brand
// section), not the shared @theme tokens in app/globals.css: those tokens
// (text-ink, text-muted, ...) are tuned for the light waitlist page and
// would be the wrong contrast on a dark background if reused here.
export const viewport: Viewport = {
  themeColor: "#060E0A",
  viewportFit: "cover",
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
    <div className="min-h-dvh bg-[#060E0A] font-sans text-[#EAF5EF] antialiased">
      <RegisterSW />
      <AppShell>{children}</AppShell>
    </div>
  );
}
