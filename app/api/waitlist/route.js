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
    // Apps Script runs doPost (and appends the row) first, then answers with a
    // 302 to a one-shot result URL. Following that URL is unreliable: after a
    // cold start it can 404 even though the row was saved. So we don't follow
    // it; a 2xx/3xx from the first hop means the write happened.
    // text/plain avoids a preflight; Apps Script reads e.postData.contents.
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ email, source: "keepyours.xyz" }),
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
