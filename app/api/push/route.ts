import { NextResponse } from "next/server";

// Hands a phone's push subscription to the keeper on the VPS, which stores it
// and sends pushes for that vault's on-chain events. The keeper's address and
// secret stay server-side; the browser only ever talks to this route.

const KEEPER_URL = process.env.KEEPER_URL;
const KEEPER_SECRET = process.env.KEEPER_SECRET;

type Subscription = { endpoint: string; keys: { p256dh: string; auth: string } };

function parse(body: unknown): { vault: string; subscription: Subscription } | null {
  if (!body || typeof body !== "object") return null;
  const { vault, subscription } = body as Record<string, unknown>;
  if (typeof vault !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(vault)) return null;
  const s = subscription as Partial<Subscription> | undefined;
  if (
    !s ||
    typeof s.endpoint !== "string" ||
    !s.endpoint.startsWith("https://") ||
    s.endpoint.length > 1000 ||
    typeof s.keys?.p256dh !== "string" ||
    typeof s.keys?.auth !== "string"
  ) {
    return null;
  }
  return { vault, subscription: { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } } };
}

export async function POST(req: Request) {
  if (!KEEPER_URL || !KEEPER_SECRET) {
    return NextResponse.json({ error: "Push isn't set up on this deployment." }, { status: 503 });
  }
  const parsed = parse(await req.json().catch(() => null));
  if (!parsed) return NextResponse.json({ error: "Bad subscription." }, { status: 400 });

  try {
    const res = await fetch(`${KEEPER_URL}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-keeper-secret": KEEPER_SECRET },
      body: JSON.stringify(parsed),
      signal: AbortSignal.timeout(8000),
    });
    return NextResponse.json({ ok: res.ok }, { status: res.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ error: "Keeper unreachable." }, { status: 502 });
  }
}
