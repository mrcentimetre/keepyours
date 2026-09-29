import { ImageResponse } from "next/og";
import { TICKET_BODY, TICKET_H, TICKET_W, ticketSvg } from "../../ticket";
import { readPass } from "../pass-params";

// The link-preview card X shows for a shared pass: the same ticket as the
// downloadable PNG, drawn on the server (X can't run our canvas code).

const W = 1200;
const H = 630;
const S = 1.6; // ticket units → pixels
const NIGHT = "#060E0A";

// Google Fonts serves TTF (which Satori needs) to a plain fetch; `text=`
// subsets each font to just the characters drawn.
async function googleFont(family, weight, text) {
  const url = `https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
  if (!src) throw new Error(`no font for ${family}`);
  return (await fetch(src[1])).arrayBuffer();
}

const svgUrl = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

// The logo is green; on the green ticket it's recoloured to Night.
async function nightLogo(origin) {
  const res = await fetch(new URL("/logo-128.png", origin));
  if (!res.ok) return null;
  const png = Buffer.from(await res.arrayBuffer()).toString("base64");
  return svgUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><filter id="t"><feFlood flood-color="${NIGHT}"/><feComposite in2="SourceAlpha" operator="in"/></filter><image href="data:image/png;base64,${png}" width="128" height="128" filter="url(#t)"/></svg>`
  );
}

// Same column maths as ticket.js's column(), with the name size estimated
// from its length (no canvas here to measure with).
function layout(name) {
  const size = Math.max(16, Math.min(30, Math.floor(TICKET_BODY.max / (name.length * 0.56))));
  const handleSize = Math.max(14, Math.round(size * 0.62));
  const block = 28 + 18 + 11 + 10 + size * 1.2 + 8 + handleSize * 1.3;
  const top = (TICKET_H - block) / 2;
  return {
    size,
    handleSize,
    lockupTop: top,
    captionTop: top + 28 + 18,
    nameTop: top + 28 + 18 + 11 + 10,
    handleTop: top + 28 + 18 + 11 + 10 + size * 1.2 + 8,
  };
}

export async function GET(request) {
  const url = new URL(request.url);
  const pass = readPass(Object.fromEntries(url.searchParams)) ?? { name: "You", handle: "keepyoursxyz" };
  const { name, handle } = pass;
  const l = layout(name);
  const footer = "Get paid. Keep yours.  ·  keepyours.xyz";

  try {
    const [display600, display800, sans, mono, logo] = await Promise.all([
      googleFont("Bricolage+Grotesque", 600, `${name}${footer}…`), // … for a cut-off long name
      googleFont("Bricolage+Grotesque", 800, "Keep Yours"),
      googleFont("IBM+Plex+Sans", 400, `@${handle}`),
      googleFont("IBM+Plex+Mono", 500, "WAITLIST PASS"),
      nightLogo(url.origin),
    ]);

    const x = TICKET_BODY.x * S;
    const text = { position: "absolute", left: x, display: "flex", color: NIGHT, lineHeight: 1 };

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(180deg, #f7fbf9 0%, #e3f5ec 100%)",
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              width: TICKET_W * S,
              height: TICKET_H * S,
              marginTop: -40,
              transform: "rotate(-2.5deg)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={svgUrl(ticketSvg(handle))} width={TICKET_W * S} height={TICKET_H * S} style={{ position: "absolute", inset: 0 }} />

            <div style={{ ...text, top: l.lockupTop * S, height: 28 * S, alignItems: "center", gap: 8 * S }}>
              {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
              {logo && <img src={logo} width={28 * S} height={28 * S} />}
              <span style={{ fontFamily: "Bricolage", fontWeight: 800, fontSize: 22 * S }}>Keep Yours</span>
            </div>
            <div style={{ ...text, top: l.captionTop * S, fontFamily: "Plex Mono", fontSize: 11 * S, letterSpacing: 2.2 * S, opacity: 0.7 }}>
              WAITLIST PASS
            </div>
            <div
              style={{
                ...text,
                top: l.nameTop * S,
                maxWidth: TICKET_BODY.max * S,
                fontFamily: "Bricolage",
                fontWeight: 600,
                fontSize: l.size * S,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {name}
            </div>
            <div style={{ ...text, top: l.handleTop * S, fontFamily: "Plex", fontSize: l.handleSize * S, opacity: 0.8 }}>
              @{handle}
            </div>
          </div>

          <div style={{ position: "absolute", bottom: 44, display: "flex", fontFamily: "Bricolage", fontWeight: 600, fontSize: 28, color: "#0b7a41" }}>
            {footer}
          </div>
        </div>
      ),
      {
        width: W,
        height: H,
        fonts: [
          { name: "Bricolage", data: display600, weight: 600, style: "normal" },
          { name: "Bricolage", data: display800, weight: 800, style: "normal" },
          { name: "Plex", data: sans, weight: 400, style: "normal" },
          { name: "Plex Mono", data: mono, weight: 500, style: "normal" },
        ],
        // Same name + handle always draws the same card.
        headers: { "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable" },
      }
    );
  } catch (err) {
    console.error("pass og failed", err);
    return new Response("Failed to draw the pass", { status: 500 });
  }
}
