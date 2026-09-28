"use client";

import { useRef, useState } from "react";

const HANDLE = 48; // px, handle diameter
const CONFIRM_THRESHOLD = 0.82; // fraction of the track the handle must cross

/** A drag-to-confirm slider, not a tap button — the deliberate motion is
 * the point (mirrors a native "slide to unlock"/"slide to pay" control).
 * Dragging short of the threshold snaps the handle back; nothing fires
 * until it's actually dragged across. */
export default function SlideToConfirm({
  label,
  onConfirm,
}: {
  label: string;
  onConfirm: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const maxXRef = useRef(0);
  const startXRef = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function onPointerDown(e: React.PointerEvent) {
    if (confirmed) return;
    const track = trackRef.current;
    if (!track) return;
    maxXRef.current = Math.max(0, track.clientWidth - HANDLE - 8);
    startXRef.current = e.clientX - dragX;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const x = Math.max(0, Math.min(maxXRef.current, e.clientX - startXRef.current));
    setDragX(x);
  }

  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    const crossed = maxXRef.current > 0 && dragX >= maxXRef.current * CONFIRM_THRESHOLD;
    if (crossed) {
      setDragX(maxXRef.current);
      setConfirmed(true);
      onConfirm();
    } else {
      setDragX(0);
    }
  }

  const progress = maxXRef.current > 0 ? dragX / maxXRef.current : 0;

  return (
    <div
      ref={trackRef}
      className="relative h-14 w-full max-w-[320px] touch-none select-none rounded-full border border-[#1E3428] bg-[#12211A]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#16B862]/50 to-[#62E6A0]/50"
        style={{ width: `${HANDLE / 2 + dragX}px` }}
      />
      <p
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-[14px] font-semibold text-[#8CA497] transition-opacity"
        style={{ opacity: 1 - progress }}
      >
        {label}
      </p>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        tabIndex={0}
        onKeyDown={(e) => {
          // Keyboard/a11y escape hatch — Enter or Space confirms directly,
          // no drag required, for anyone who can't perform a pointer drag.
          if ((e.key === "Enter" || e.key === " ") && !confirmed) {
            e.preventDefault();
            setDragX(maxXRef.current || 260);
            setConfirmed(true);
            onConfirm();
          }
        }}
        className="absolute top-1 left-1 flex size-12 cursor-grab items-center justify-center rounded-full bg-gradient-to-r from-[#16B862] to-[#62E6A0] text-[#03170C] active:cursor-grabbing"
        style={{ transform: `translateX(${dragX}px)`, transition: dragging ? "none" : "transform 0.2s ease-out" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
