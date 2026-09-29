// A shared pass link carries only the name and X handle the person chose to
// post — never their email. Anything that doesn't validate is dropped, and
// the page falls back to the plain site preview.

const HANDLE = /^[A-Za-z0-9_]{1,15}$/;
export const NAME_MAX = 40;

export function readPass(params) {
  const one = (v) => (Array.isArray(v) ? v[0] : v);
  const name = typeof one(params?.n) === "string" ? one(params.n).trim().slice(0, NAME_MAX) : "";
  const handle = typeof one(params?.h) === "string" ? one(params.h).trim().replace(/^@+/, "") : "";
  if (!name || !HANDLE.test(handle)) return null;
  return { name, handle };
}

export function passQuery({ name, handle }) {
  return new URLSearchParams({ n: name, h: handle }).toString();
}
