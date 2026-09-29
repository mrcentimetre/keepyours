import type { Metadata } from "next";
import Home from "../page";
import { passQuery, readPass } from "@/lib/pass-params";

// keepyours.xyz/pass?n=Name&h=handle — the link in a shared "Post on X".
// People who click it get the normal landing page (and can join); X's
// crawler reads the metadata below and shows the sharer's own pass as the
// card. Rendered, not redirected: a redirect would hand the crawler the
// home page's generic preview instead.

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const pass = readPass(await searchParams);
  if (!pass) return {};

  const title = `${pass.name} is on the Keep Yours waitlist`;
  const description = "Get paid. Keep yours. Savings for people paid in crypto, on Arbitrum. Join the waitlist.";
  const image = {
    url: `/pass/og?${passQuery(pass)}`,
    width: 1200,
    height: 630,
    alt: `${pass.name}'s Keep Yours waitlist pass`,
  };

  return {
    title,
    description,
    // Shared on X on purpose, but no reason for search engines to index names.
    robots: { index: false, follow: true },
    openGraph: { title, description, url: `/pass?${passQuery(pass)}`, type: "website", images: [image] },
    twitter: { card: "summary_large_image", site: "@keepyoursxyz", title, description, images: [image] },
  };
}

export default Home;
