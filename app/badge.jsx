"use client";

import { useEffect, useRef } from "react";
import { registerBadge } from "./badge-renderer";
import { FALLBACK } from "./badge-shaders";

export default function Badge({ preset = "keep", tag, children }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return registerBadge(canvas, preset) ?? undefined;
  }, [preset]);

  return (
    <span className="inline-flex items-center gap-2.5 rounded-[11px] bg-[#060e0a] p-1 pr-3.5 text-[15px] leading-none text-[#eaf5ef] shadow-[0_10px_24px_-14px_rgba(6,14,10,0.7)]">
      <span
        className="relative isolate overflow-hidden rounded-[8px] px-2.5 py-[7px] font-semibold"
        style={{ background: FALLBACK[preset] }}
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 -z-10 block h-full w-full"
        />
        <span className="[text-shadow:0_0_6px_rgb(0_0_0/0.45),0_1px_1px_rgb(0_0_0/0.25)]">
          {tag}
        </span>
      </span>
      <span className="whitespace-nowrap">{children}</span>
    </span>
  );
}
