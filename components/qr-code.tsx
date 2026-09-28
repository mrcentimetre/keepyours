"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

// Dark modules on a white card, not the reverse: it's the safe choice for
// real-world scan reliability across phone camera apps, even though the
// rest of this page is dark. Generated client-side so it never depends on a
// third-party QR API being reachable during a review.
export default function QrCode({ value, size = 176 }: { value: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    QRCode.toCanvas(ref.current, value, {
      width: size,
      margin: 1,
      color: { dark: "#060E0A", light: "#FFFFFF" },
    }).catch(() => {});
  }, [value, size]);

  return (
    <div className="inline-block rounded-2xl bg-white p-3 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]">
      <canvas ref={ref} width={size} height={size} />
    </div>
  );
}
