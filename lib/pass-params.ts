// A shared pass link carries only the name and X handle the person chose to
// post — never their email. Anything that doesn't validate is dropped, and
// the page falls back to the plain site preview.

const HANDLE = /^[A-Za-z0-9_]{1,15}$/;
export const NAME_MAX = 40;

export type PassInfo = { name: string; handle: string };
type Params = Record<string, string | string[] | undefined>;

export function readPass(params: Params | null | undefined): PassInfo | null {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const n = one(params?.n);
  const h = one(params?.h);
  const name = typeof n === "string" ? n.trim().slice(0, NAME_MAX) : "";
  const handle = typeof h === "string" ? h.trim().replace(/^@+/, "") : "";
  if (!name || !HANDLE.test(handle)) return null;
  return { name, handle };
}

export function passQuery({ name, handle }: PassInfo): string {
  return new URLSearchParams({ n: name, h: handle }).toString();
}
