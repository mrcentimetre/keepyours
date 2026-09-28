import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

const SITE = "https://keepyours.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Keep Yours — get paid, keep yours",
  description:
    "A savings layer for people paid in crypto. Every USDC payment splits into spend and save. Savings sit behind a cooldown so they can't be traded away, and you can borrow against them before payday.",
  icons: {
    icon: [{ url: "/logo-256.png", sizes: "256x256", type: "image/png" }],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Keep Yours — get paid, keep yours",
    description:
      "Savings for people paid in crypto. Split every payment, lock what you keep, borrow against it before payday. On Arbitrum.",
    url: SITE,
    type: "website",
    images: [{ url: "/og-banner.png", width: 1200, height: 400 }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@keepyoursxyz",
  },
};

export const viewport: Viewport = {
  themeColor: "#F3FAF6",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${plex.variable}`}>
      <body className="relative m-0 flex min-h-dvh flex-col bg-transparent font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
