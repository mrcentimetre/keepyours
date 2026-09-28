"use client";

import { useRef, useState } from "react";
import { ArrowRight, Check, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

const HANDLE = 56; // px, handle diameter
const INSET = 4; // px, track padding around the handle
const CONFIRM_THRESHOLD = 0.82; // fraction of the track the handle must cross

/** A drag-to-confirm control, not a tap button — the deliberate motion is
 * the point (a native "slide to pay"). Dragging short of the threshold snaps
 * back; nothing fires until it's actually dragged across. Enter/Space on the
 * handle confirms too, for anyone who can't perform a drag. */
export default function SlideToConfirm({
  label,
  onConfirm,
  className,
}: {
  label: string;
  onConfirm: () => void;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const maxXRef = useRef(0);
  const startXRef = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function measure() {
    const track = trackRef.current;
    maxXRef.current = track ? Math.max(0, track.clientWidth - HANDLE - INSET * 2) : 0;
  }

  function finish() {
    measure();
    setDragX(maxXRef.current);
    setConfirmed(true);
    onConfirm();
  }

  function onPointerDown(e: React.PointerEvent) {
    if (confirmed) return;
    measure();
    startXRef.current = e.clientX - dragX;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDragX(Math.max(0, Math.min(maxXRef.current, e.clientX - startXRef.current)));
  }

  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (maxXRef.current > 0 && dragX >= maxXRef.current * CONFIRM_THRESHOLD) finish();
    else setDragX(0);
  }

  const progress = maxXRef.current > 0 ? dragX / maxXRef.current : 0;

  return (
    <div
      ref={trackRef}
      // Inside a vaul sheet, a drag here would otherwise also drag the sheet.
      data-vaul-no-drag=""
      className={cn(
        "relative h-16 w-full touch-none overflow-hidden rounded-full bg-surface-2 ring-1 ring-hairline select-none",
        className
      )}
    >
      {/* Fill that follows the handle. */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/30 to-accent/40"
        style={{
          width: `${HANDLE + INSET * 2 + dragX}px`,
          transition: dragging ? "none" : "width 0.25s ease-out",
        }}
      />
      <p
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1 pl-10 text-[15px] font-semibold text-foreground/80"
        style={{ opacity: confirmed ? 0 : 1 - progress * 1.4 }}
      >
        {label}
        <ChevronsRight className="size-4 animate-pulse text-muted-foreground" />
      </p>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="button"
        aria-label={label}
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !confirmed) {
            e.preventDefault();
            finish();
          }
        }}
        className="absolute flex cursor-grab items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary text-primary-foreground shadow-brand active:cursor-grabbing"
        style={{
          top: INSET,
          left: INSET,
          width: HANDLE,
          height: HANDLE,
          transform: `translateX(${dragX}px)`,
          transition: dragging ? "none" : "transform 0.25s ease-out",
        }}
      >
        {confirmed ? <Check className="size-6" strokeWidth={2.75} /> : <ArrowRight className="size-6" strokeWidth={2.5} />}
      </div>
    </div>
  );
}
