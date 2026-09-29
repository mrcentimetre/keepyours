const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const HANDLE = /^[A-Za-z0-9_]{1,15}$/;

type Signup = { email: string; name: string; handle: string };

const str = (body: Record<string, unknown>, key: string) =>
  typeof body[key] === "string" ? (body[key] as string).trim() : "";

// Returns the signup, or { error } for a bad body.
function parseSignup(raw: unknown): Signup | { error: string } {
  const body = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};

  const email = str(body, "email");
  if (!EMAIL.test(email) || email.length > 254) return { error: "invalid email" };

  const name = str(body, "name");
  if (!name || name.length > 40) return { error: "invalid name" };

  const handle = str(body, "handle").replace(/^@+/, "");
  if (!HANDLE.test(handle)) return { error: "invalid handle" };
  if (body.consent !== true) return { error: "consent required" };

  return { email, name, handle };
}

export async function POST(request: Request) {
  const endpoint = process.env.WAITLIST_ENDPOINT;
  if (!endpoint) {
    console.error("WAITLIST_ENDPOINT is not set");
    return Response.json({ error: "not configured" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const signup = parseSignup(body);
  if ("error" in signup) return Response.json({ error: signup.error }, { status: 400 });
  const { email, name, handle } = signup;

  try {
    // Apps Script runs doPost (and appends the row) first, then answers with a
    // 302 to a one-shot result URL. Following that URL is unreliable: after a
    // cold start it can 404 even though the row was saved. So we don't follow
    // it; a 2xx/3xx from the first hop means the write happened.
    // text/plain avoids a preflight; Apps Script reads e.postData.contents.
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ email, name, handle, consent: true, source: "keepyours.xyz" }),
      redirect: "manual",
      signal: AbortSignal.timeout(50_000),
    });

    if (res.status < 200 || res.status >= 400) {
      console.error("waitlist endpoint returned", res.status);
      return Response.json({ error: "upstream failed" }, { status: 502 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("waitlist endpoint unreachable", err);
    return Response.json({ error: "upstream failed" }, { status: 502 });
  }
}
