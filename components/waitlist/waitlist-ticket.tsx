"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  LAYERS,
  STUB_CLIP,
  TICKET_H,
  TICKET_W,
  drawLayer,
  loadPassAssets,
  ticketBlob,
  type LayerName,
  type Pass,
} from "@/lib/ticket";
import { passQuery, type PassInfo } from "@/lib/pass-params";

const SITE = "https://keepyours.xyz";

// Handover order: ticket swings in, barcode prints, the lines rise, then the copy.
const STEP: Partial<Record<LayerName, { anim: string; d: string }>> = {
  code: { anim: "motion-safe:animate-print", d: "0.3s" },
  brand: { anim: "motion-safe:animate-rise", d: "0.42s" },
  name: { anim: "motion-safe:animate-rise", d: "0.5s" },
  handle: { anim: "motion-safe:animate-rise", d: "0.58s" },
};

// The animations read their delay and clip range from CSS variables.
const vars = (v: Record<string, string>) => v as CSSProperties;

export default function WaitlistTicket({ name, handle }: PassInfo) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<Partial<Record<LayerName, HTMLCanvasElement | null>>>({});
  const [pass, setPass] = useState<Pass | null>(null);
  const [status, setStatus] = useState<"idle" | "working" | "failed">("idle");

  useEffect(() => {
    let live = true;
    loadPassAssets().then((assets) => live && setPass({ name, handle, ...assets }));
    return () => {
      live = false;
    };
  }, [name, handle]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!pass || !wrap) return;

    const draw = () => {
      const width = wrap.offsetWidth;
      if (!width) return;
      for (const [name] of LAYERS) {
        const canvas = layerRefs.current[name];
        if (canvas) drawLayer(canvas, name, pass, width);
      }
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [pass]);

  async function onDownload() {
    if (!pass) return;
    setStatus("working");
    try {
      const blob = await ticketBlob(pass);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `keep-yours-pass-${handle.toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setStatus("idle");
    } catch {
      setStatus("failed");
    }
  }

  // The pass PNG, made ahead of time: iOS only opens the share sheet if
  // share() runs straight from the tap, with no slow work in between.
  const fileRef = useRef<File | null>(null);
  useEffect(() => {
    if (!pass) return;
    ticketBlob(pass)
      .then((blob) => {
        fileRef.current = new File([blob], `keep-yours-pass-${handle.toLowerCase()}.png`, { type: "image/png" });
      })
      .catch(() => {});
  }, [pass, handle]);

  // Their own link: X shows their pass as the card (app/pass/og).
  const passLink = `${SITE}/pass?${passQuery({ name, handle })}`;
  const shareText = "I'm on the Keep Yours waitlist. Get paid. Keep yours.";

  const isPhone = () => window.matchMedia("(pointer: coarse)").matches;

  // Straight to X — no share sheet to pick from. A web page can't attach an
  // image to an X post, so the post carries the person's own link and X
  // shows their pass as the card (app/pass/og). On a phone, a same-tab
  // x.com link is a universal link: it opens the X app if installed.
  function onShare() {
    const url = new URL("https://x.com/intent/post");
    url.searchParams.set("text", shareText);
    url.searchParams.set("url", passLink);
    url.searchParams.set("via", "keepyoursxyz");
    if (isPhone()) window.location.href = url.toString();
    else window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  // Phones: the share sheet has "Save Image" (to Photos); a blob download
  // in iOS Safari just opens a preview. Desktop keeps a normal download.
  async function onSave() {
    const file = fileRef.current;
    if (isPhone() && file && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
      } catch {
        // closed the sheet — nothing to do
      }
      return;
    }
    onDownload();
  }

  const button =
    "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-[14px] font-medium whitespace-nowrap transition duration-200 hover:-translate-y-0.5 active:scale-[0.97] disabled:translate-y-0 disabled:scale-100 disabled:cursor-default disabled:opacity-60";

  return (
    <div className="flex w-full flex-col items-center text-center">
      <div
        ref={wrapRef}
        className="w-[min(560px,100%)]"
        style={{ aspectRatio: `${TICKET_W} / ${TICKET_H}` }}
      >
        {pass && (
          <div className="size-full motion-safe:animate-issue">
            {/* drop-shadow follows the notches; kept off the animated element's filter */}
            <div
              role="img"
              aria-label={`Keep Yours waitlist pass for ${name}, @${handle}`}
              className="relative size-full drop-shadow-[0_16px_30px_rgba(8,45,28,0.2)]"
            >
              {LAYERS.map(([name]) => (
                <canvas
                  key={name}
                  ref={(el) => {
                    layerRefs.current[name] = el;
                  }}
                  aria-hidden="true"
                  className={`absolute inset-0 block size-full ${STEP[name]?.anim ?? ""}`}
                  style={
                    STEP[name]
                      ? vars({ "--d": STEP[name].d, "--clip-from": STUB_CLIP.from, "--clip-to": STUB_CLIP.to })
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {pass && (
        <>
          <p
            className="m-0 mt-8 font-display text-[clamp(26px,4vw,32px)] leading-tight font-semibold text-green-deep motion-safe:animate-rise"
            style={vars({ "--d": "0.68s" })}
          >
            Welcome!!!
          </p>
          <p
            className="m-0 mt-1 text-[clamp(16px,2.2vw,19px)] text-ink-2 motion-safe:animate-rise"
            style={vars({ "--d": "0.76s" })}
          >
            You&rsquo;re on the list. One email when it opens.
          </p>

          <div className="mt-6 flex justify-center gap-2.5 motion-safe:animate-rise" style={vars({ "--d": "0.86s" })}>
            <button
              type="button"
              onClick={onSave}
              disabled={status === "working"}
              className={`${button} border border-green-deep bg-transparent text-green-deep`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 3.75v11m0 0 4-4m-4 4-4-4M4.5 17.5v1.25a1.75 1.75 0 0 0 1.75 1.75h11.5a1.75 1.75 0 0 0 1.75-1.75V17.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {status === "working" ? "Saving…" : "Download pass"}
            </button>
            <button
              type="button"
              onClick={onShare}
              className={`${button} border-0 bg-[#060e0a] text-[#eaf5ef]`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.9 2H22l-7.1 8.1L23.3 22h-6.6l-5.2-6.8L5.6 22H2.5l7.6-8.7L1.1 2h6.8l4.7 6.2L18.9 2Zm-1.1 18h1.7L7.3 3.8H5.5L17.8 20Z" />
              </svg>
              Post on X
            </button>
          </div>
        </>
      )}

      <p role="status" aria-live="polite" className="m-0 mt-2 min-h-5 text-sm text-[#b23a3a]">
        {status === "failed" ? "Couldn't save the image. Try again." : ""}
      </p>
    </div>
  );
}
