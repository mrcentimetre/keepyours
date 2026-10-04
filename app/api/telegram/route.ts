import { NextResponse } from "next/server";

// Telegram alerts: asks the keeper whether a vault is connected, and for a
// one-time code to connect it. The keeper's address and secret stay here.

const KEEPER_URL = process.env.KEEPER_URL;
const KEEPER_SECRET = process.env.KEEPER_SECRET;
const isVault = (v: unknown): v is string => typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v);

async function keeper(path: string, init?: RequestInit) {
  if (!KEEPER_URL || !KEEPER_SECRET) return null;
  try {
    const res = await fetch(`${KEEPER_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", "x-keeper-secret": KEEPER_SECRET },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) };
  } catch {
    return null;
  }
}

/** ?vault=0x… → { enabled, linked } */
export async function GET(req: Request) {
  const vault = new URL(req.url).searchParams.get("vault");
  if (!isVault(vault)) return NextResponse.json({ error: "Bad vault." }, { status: 400 });
  const r = await keeper(`/telegram/status?vault=${vault}`);
  if (!r?.ok) return NextResponse.json({ enabled: false, linked: false });
  return NextResponse.json({ enabled: Boolean(r.body.enabled), linked: Boolean(r.body.linked) });
}

/** { vault } → { url } to open in Telegram */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const vault = (body as { vault?: unknown } | null)?.vault;
  if (!isVault(vault)) return NextResponse.json({ error: "Bad vault." }, { status: 400 });
  const r = await keeper("/telegram/link", { method: "POST", body: JSON.stringify({ vault }) });
  if (!r?.ok || !r.body.bot || !r.body.code) {
    return NextResponse.json({ error: "Telegram alerts aren't available right now." }, { status: 503 });
  }
  return NextResponse.json({ url: `https://t.me/${r.body.bot}?start=${r.body.code}` });
}
