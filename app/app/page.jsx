// Placeholder route for the product app, at /app.
// Real content (install gate, detect standalone/installed state, desktop QR
// page) lands in T1.1 — see docs/BUILD-PLAN.md.

export const metadata = {
  title: "Keep Yours — app",
};

export default function AppEntry() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="font-display text-2xl font-bold">Keep Yours</p>
      <p className="text-sm text-muted">The app lives here. Coming soon.</p>
    </main>
  );
}
