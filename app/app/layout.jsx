import RegisterSW from "./register-sw";

// The product app is a dark, "Night" theme — different from the waitlist's
// light theme at /. Colours here are literal hex (CLAUDE.md's Brand
// section), not the shared @theme tokens in app/globals.css: those tokens
// (text-ink, text-muted, ...) are tuned for the light waitlist page and
// would be the wrong contrast on a dark background if reused here.
export const viewport = {
  themeColor: "#060E0A",
  viewportFit: "cover",
};

export default function AppLayout({ children }) {
  return (
    <div className="min-h-dvh bg-[#060E0A] font-sans text-[#EAF5EF] antialiased">
      <RegisterSW />
      {children}
    </div>
  );
}
