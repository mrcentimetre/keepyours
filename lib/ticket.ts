// The on-screen pass and the downloaded PNG use the same painters, so they
// can't drift apart.

type Ctx = CanvasRenderingContext2D;
export type LayerName = "shape" | "code" | "brand" | "name" | "handle";
export type PassAssets = {
  fonts: { display: string; sans: string; mono: string };
  logo: HTMLCanvasElement | null; // the logo, recoloured to Night
};
export type Pass = PassAssets & { name: string; handle: string };

function get2d(canvas: HTMLCanvasElement): Ctx {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return ctx;
}
export const TICKET_W = 600;
export const TICKET_H = 272;

const CORNER = 22;
const SPLIT = 216;
const NOTCH = 16;
const CODE_W = 142;
const CODE_H = 172;
const CODE_X = (SPLIT - CODE_W) / 2;
const CODE_Y = (TICKET_H - CODE_H) / 2;

// Right-side insets (%) that bound the barcode print sweep to the stub.
export const STUB_CLIP = {
  from: `${(1 - (CODE_X - 2) / TICKET_W) * 100}%`,
  to: `${(1 - SPLIT / TICKET_W) * 100}%`,
};

const BODY_X = SPLIT + 30;
const BODY_MAX = TICKET_W - BODY_X - 36;

const C = {
  night: "#060E0A",
  green: "#16B862",
  mint: "#62E6A0",
};

const EXPORT_W = 1200;
const EXPORT_H = 675;
const EXPORT_SCALE = 2;

function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function barcode(seed: string): number[] {
  let s = hash(seed) || 1;
  const next = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
  return Array.from({ length: 45 }, () => 1 + Math.floor(next() * 3));
}

// Scooped corners plus a notch top and bottom at the tear line.
function ticketPath(ctx: Ctx) {
  const W = TICKET_W;
  const H = TICKET_H;
  ctx.beginPath();
  ctx.moveTo(CORNER, 0);
  ctx.arc(SPLIT, 0, NOTCH, Math.PI, 0, true);
  ctx.lineTo(W - CORNER, 0);
  ctx.arc(W, 0, CORNER, Math.PI, Math.PI / 2, true);
  ctx.lineTo(W, H - CORNER);
  ctx.arc(W, H, CORNER, (3 * Math.PI) / 2, Math.PI, true);
  ctx.arc(SPLIT, H, NOTCH, 0, Math.PI, true);
  ctx.lineTo(CORNER, H);
  ctx.arc(0, H, CORNER, 0, -Math.PI / 2, true);
  ctx.lineTo(0, CORNER);
  ctx.arc(0, 0, CORNER, Math.PI / 2, 0, true);
  ctx.closePath();
}

/**
 * The ticket's shape, barcode and tear line as an SVG — for the server-drawn
 * link preview (app/pass/og), which has no canvas. Same geometry as
 * ticketPath() and paintShape()/paintCode() above; text is laid on top there.
 */
export function ticketSvg(handle: string): string {
  const W = TICKET_W;
  const H = TICKET_H;
  const r = CORNER;
  const n = NOTCH;
  const path = [
    `M${r} 0`,
    `L${SPLIT - n} 0 A${n} ${n} 0 0 0 ${SPLIT + n} 0`,
    `L${W - r} 0 A${r} ${r} 0 0 0 ${W} ${r}`,
    `L${W} ${H - r} A${r} ${r} 0 0 0 ${W - r} ${H}`,
    `L${SPLIT + n} ${H} A${n} ${n} 0 0 0 ${SPLIT - n} ${H}`,
    `L${r} ${H} A${r} ${r} 0 0 0 0 ${H - r}`,
    `L0 ${r} A${r} ${r} 0 0 0 ${r} 0 Z`,
  ].join(" ");

  const widths = barcode(handle.toLowerCase());
  const unit = CODE_W / widths.reduce((a, b) => a + b, 0);
  let x = CODE_X;
  const bars = widths
    .map((w, i) => {
      const bar = i % 2 === 0 ? `<rect x="${x}" y="${CODE_Y}" width="${w * unit}" height="${CODE_H}"/>` : "";
      x += w * unit;
      return bar;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="${H}" x2="${W}" y2="0"><stop offset="0" stop-color="${C.mint}"/><stop offset="1" stop-color="${C.green}"/></linearGradient></defs><path d="${path}" fill="url(#g)"/><line x1="${SPLIT}" y1="${NOTCH + 10}" x2="${SPLIT}" y2="${H - NOTCH - 10}" stroke="rgba(6,14,10,0.32)" stroke-width="2.5" stroke-dasharray="9 7" stroke-linecap="round"/><g fill="${C.night}">${bars}</g></svg>`;
}

export const TICKET_BODY = { x: BODY_X, max: BODY_MAX };

function tracked(ctx: Ctx, text: string, x: number, y: number, em: number) {
  // letterSpacing is newer than the TS DOM types assume everywhere; older
  // Safari lacks it, so fall back to spaced-out letters.
  const c = ctx as Ctx & { letterSpacing?: string };
  if (c.letterSpacing !== undefined) {
    c.letterSpacing = `${em}px`;
    c.fillText(text, x, y);
    c.letterSpacing = "0px";
  } else {
    ctx.fillText(text.split("").join(" "), x, y);
  }
}

function ellipsize(ctx: Ctx, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > max) cut = cut.slice(0, -1);
  return `${cut}…`;
}

// The pass shows the person's name, never their email: it's made to be
// posted publicly. Shrink to fit first, truncate only as a last resort.
const NAME_WEIGHT = 600;

function fitName(ctx: Ctx, name: string, font: string): { size: number; text: string } {
  for (let size = 30; size >= 16; size--) {
    ctx.font = `${NAME_WEIGHT} ${size}px ${font}`;
    if (ctx.measureText(name).width <= BODY_MAX) return { size, text: name };
  }
  return { size: 16, text: ellipsize(ctx, name, BODY_MAX) };
}

// Where each row of the body column sits, centred as one block.
function column(ctx: Ctx, pass: Pass) {
  const fit = fitName(ctx, pass.name, pass.fonts.display);
  const handleSize = Math.max(14, Math.round(fit.size * 0.62));
  const lockup = 28;
  const caption = 11;
  const name = fit.size * 1.2;
  const block = lockup + 18 + caption + 10 + name + 8 + handleSize * 1.3;
  const top = (TICKET_H - block) / 2;
  return {
    fit,
    handleSize,
    lockupTop: top,
    captionTop: top + lockup + 18,
    nameTop: top + lockup + 18 + caption + 10,
    handleTop: top + lockup + 18 + caption + 10 + name + 8,
  };
}

function paintShape(ctx: Ctx) {
  ticketPath(ctx);
  const fill = ctx.createLinearGradient(0, TICKET_H, TICKET_W, 0);
  fill.addColorStop(0, C.mint);
  fill.addColorStop(1, C.green);
  ctx.fillStyle = fill;
  ctx.fill();

  ctx.save();
  ctx.setLineDash([9, 7]);
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(6, 14, 10, 0.32)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(SPLIT, NOTCH + 10);
  ctx.lineTo(SPLIT, TICKET_H - NOTCH - 10);
  ctx.stroke();
  ctx.restore();
}

function paintCode(ctx: Ctx, { handle }: Pass) {
  const widths = barcode(handle.toLowerCase());
  const units = widths.reduce((a, b) => a + b, 0);
  const unit = CODE_W / units;
  ctx.fillStyle = C.night;
  let x = CODE_X;
  widths.forEach((w, i) => {
    if (i % 2 === 0) ctx.fillRect(x, CODE_Y, w * unit, CODE_H);
    x += w * unit;
  });
}

function paintBrand(ctx: Ctx, pass: Pass) {
  const { fonts, logo } = pass;
  const { lockupTop, captionTop } = column(ctx, pass);
  if (logo) ctx.drawImage(logo, BODY_X, lockupTop, 28, 28);
  ctx.fillStyle = C.night;
  ctx.font = `800 22px ${fonts.display}`;
  ctx.textBaseline = "middle";
  ctx.fillText("Keep Yours", BODY_X + (logo ? 36 : 0), lockupTop + 15);

  ctx.textBaseline = "top";
  ctx.globalAlpha = 0.7;
  ctx.font = `500 11px ${fonts.mono}`;
  tracked(ctx, "WAITLIST PASS", BODY_X, captionTop, 2.2);
}

function paintName(ctx: Ctx, pass: Pass) {
  const { fit, nameTop } = column(ctx, pass);
  ctx.fillStyle = C.night;
  ctx.textBaseline = "top";
  ctx.font = `${NAME_WEIGHT} ${fit.size}px ${pass.fonts.display}`;
  ctx.fillText(fit.text, BODY_X, nameTop);
}

function paintHandle(ctx: Ctx, pass: Pass) {
  const { handleSize, handleTop } = column(ctx, pass);
  ctx.fillStyle = C.night;
  ctx.globalAlpha = 0.8;
  ctx.textBaseline = "top";
  ctx.font = `400 ${handleSize}px ${pass.fonts.sans}`;
  ctx.fillText(ellipsize(ctx, `@${pass.handle}`, BODY_MAX), BODY_X, handleTop);
}

// Separate layers so the screen can animate each part; the PNG stacks them all.
export const LAYERS: [LayerName, (ctx: Ctx, pass: Pass) => void][] = [
  ["shape", paintShape],
  ["code", paintCode],
  ["brand", paintBrand],
  ["name", paintName],
  ["handle", paintHandle],
];

function paintTicket(ctx: Ctx, pass: Pass) {
  for (const [, paint] of LAYERS) {
    ctx.save();
    ctx.textAlign = "left";
    paint(ctx, pass);
    ctx.restore();
  }
}

export function drawLayer(canvas: HTMLCanvasElement, name: LayerName, pass: Pass, width: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const scale = width / TICKET_W;
  canvas.width = Math.round(TICKET_W * scale * dpr);
  canvas.height = Math.round(TICKET_H * scale * dpr);
  const ctx = get2d(canvas);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  ctx.textAlign = "left";
  LAYERS.find(([n]) => n === name)?.[1](ctx, pass);
}

export function ticketBlob(pass: Pass): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_W * EXPORT_SCALE;
  canvas.height = EXPORT_H * EXPORT_SCALE;
  const ctx = get2d(canvas);
  ctx.scale(EXPORT_SCALE, EXPORT_SCALE);

  const bg = ctx.createLinearGradient(0, 0, 0, EXPORT_H);
  bg.addColorStop(0, "#f7fbf9");
  bg.addColorStop(1, "#e3f5ec");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);

  const s = 1.55;
  ctx.save();
  ctx.translate(EXPORT_W / 2, EXPORT_H / 2 - 20);
  ctx.rotate((-2.5 * Math.PI) / 180);
  ctx.scale(s, s);
  ctx.translate(-TICKET_W / 2, -TICKET_H / 2);
  ctx.shadowColor = "rgba(8, 45, 28, 0.22)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 14;
  ticketPath(ctx);
  ctx.fillStyle = C.green;
  ctx.fill();
  ctx.shadowColor = "transparent";
  paintTicket(ctx, pass);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.fillStyle = "#0b7a41";
  ctx.font = `600 22px ${pass.fonts.display}`;
  ctx.fillText("Get paid. Keep yours.  ·  keepyours.xyz", EXPORT_W / 2, EXPORT_H - 40);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))), "image/png");
  });
}

// The logo is green, so it is recoloured to Night to show on the green ticket.
function tint(img: HTMLImageElement, color: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = get2d(c);
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  return c;
}

export async function loadPassAssets(): Promise<PassAssets> {
  const root = getComputedStyle(document.documentElement);
  const read = (v: string, fallback: string) => root.getPropertyValue(v).trim() || fallback;
  const fonts = {
    display: read("--font-bricolage", "system-ui, sans-serif"),
    sans: read("--font-plex", "system-ui, sans-serif"),
    mono: read("--font-plex-mono", "ui-monospace, monospace"),
  };

  const logo = new Image();
  logo.src = "/logo-128.png";

  await Promise.allSettled([
    document.fonts?.load(`800 22px ${fonts.display}`),
    document.fonts?.load(`600 22px ${fonts.display}`),
    document.fonts?.load(`500 20px ${fonts.sans}`),
    document.fonts?.load(`400 20px ${fonts.sans}`),
    document.fonts?.load(`500 11px ${fonts.mono}`),
    logo.decode(),
  ]);

  return { fonts, logo: logo.complete && logo.naturalWidth ? tint(logo, C.night) : null };
}
