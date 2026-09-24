const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(request) {
  const endpoint = process.env.WAITLIST_ENDPOINT;
  if (!endpoint) {
    console.error("WAITLIST_ENDPOINT is not set");
    return Response.json({ error: "not configured" }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!EMAIL.test(email) || email.length > 254) {
    return Response.json({ error: "invalid email" }, { status: 400 });
  }

  try {
    // Apps Script sends no CORS headers, but this runs server-side so that
    // doesn't matter. text/plain avoids a preflight and Apps Script reads
    // the raw body from e.postData.contents either way.
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ email, source: "keepyours.xyz" }),
      redirect: "follow",
    });

    if (!res.ok) {
      console.error("waitlist endpoint returned", res.status);
      return Response.json({ error: "upstream failed" }, { status: 502 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("waitlist endpoint unreachable", err);
    return Response.json({ error: "upstream failed" }, { status: 502 });
  }
}
