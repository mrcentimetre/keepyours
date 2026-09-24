import "./globals.css";

const SITE = "https://keepyours.xyz";

export const metadata = {
  metadataBase: new URL(SITE),
  title: "Keep Yours — get paid, keep yours",
  description:
    "A savings layer for people paid in crypto. Every USDC payment splits into spend and save. Savings sit behind a cooldown so they can't be traded away, and you can borrow against them before payday.",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/logo-256.png", sizes: "256x256", type: "image/png" },
    ],
    apple: "/logo-256.png",
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
    site: "@keepyours",
  },
};

export const viewport = {
  themeColor: "#EFF8F3",
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
