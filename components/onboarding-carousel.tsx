"use client";

import { useRef, useState } from "react";
import SlideToConfirm from "./slide-to-confirm";

export const ONBOARDED_KEY = "ky_onboarded";

type Slide = {
  headline: string;
  body: string;
  icon: React.ReactNode;
};

function SplitIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v6" stroke="#62E6A0" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 9c0 3-5 3-5 7M12 9c0 3 5 3 5 7" stroke="#62E6A0" strokeWidth="2" strokeLinecap="round" />
      <circle cx="7" cy="18" r="2.5" fill="#62E6A0" />
      <circle cx="17" cy="18" r="2.5" fill="#16B862" />
    </svg>
  );
}

function CooldownIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="13" r="8" stroke="#F4B545" strokeWidth="2" />
      <path d="M12 9v4l3 2" stroke="#F4B545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 2h6" stroke="#F4B545" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function AdvanceIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="10" width="18" height="11" rx="2" stroke="#62E6A0" strokeWidth="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="#62E6A0" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="15.5" r="1.6" fill="#16B862" />
    </svg>
  );
}

const SLIDES: Slide[] = [
  {
    headline: "Every payment splits",
    body: "Set it once. Every USDC payment splits automatically into what you spend and what you keep.",
    icon: <SplitIcon />,
  },
  {
    headline: "Savings wait before they leave",
    body: "The part you keep takes up to 72 hours to withdraw, and only ever goes to an address you chose in advance. Cancel any time.",
    icon: <CooldownIcon />,
  },
  {
    headline: "Advance against your own savings",
    body: "Need cash before the client pays? Borrow up to 50% of what you've kept, free for the first 30 days. No credit check, nobody to chase.",
    icon: <AdvanceIcon />,
  },
];

export default function OnboardingCarousel({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const widthRef = useRef(1);
  const last = i === SLIDES.length - 1;

  function onPointerDown(e: React.PointerEvent) {
    widthRef.current = trackRef.current?.clientWidth || 1;
    startXRef.current = e.clientX;
    setDragging(true);
    // Without capture, a fast swipe that outruns the finger's starting
    // element stops delivering move events to this div — the same fix
    // SlideToConfirm needs for the same reason.
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDragX(e.clientX - startXRef.current);
  }

  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    const threshold = widthRef.current * 0.18;
    if (dragX <= -threshold && i < SLIDES.length - 1) setI(i + 1);
    else if (dragX >= threshold && i > 0) setI(i - 1);
    setDragX(0);
  }

  return (
    <main className="flex min-h-dvh flex-col p-8">
      <div className="flex h-6 justify-end">
        {!last && (
          <button
            type="button"
            onClick={onDone}
            className="text-[13px] text-[#8CA497] hover:text-[#BFD8C9]"
          >
            Skip
          </button>
        )}
      </div>

      <div
        ref={trackRef}
        className="flex flex-1 touch-pan-y select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="flex w-full shrink-0"
          style={{
            transform: `translateX(calc(${-i * 100}% + ${dragX}px))`,
            transition: dragging ? "none" : "transform 0.25s ease-out",
          }}
        >
          {SLIDES.map((s) => (
            <div
              key={s.headline}
              className="flex w-full shrink-0 flex-col items-center justify-center gap-5 px-2 text-center"
            >
              <div className="flex size-16 items-center justify-center rounded-2xl border border-[#1E3428] bg-[#12211A]">
                {s.icon}
              </div>
              <p className="font-display text-[26px] font-bold">{s.headline}</p>
              <p className="max-w-[36ch] text-[15px] leading-relaxed text-[#8CA497]">{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-5 pb-4">
        <div className="flex gap-2">
          {SLIDES.map((s, idx) => (
            <button
              key={s.headline}
              type="button"
              onClick={() => setI(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={
                "h-1.5 rounded-full transition-all " +
                (idx === i ? "w-6 bg-[#62E6A0]" : "w-1.5 bg-[#2C4A3B]")
              }
            />
          ))}
        </div>

        {last ? (
          <SlideToConfirm label="Slide to get started" onConfirm={onDone} />
        ) : (
          <button
            type="button"
            onClick={() => setI(i + 1)}
            className="w-full max-w-[320px] rounded-full bg-gradient-to-r from-[#16B862] to-[#62E6A0] py-3.5 text-[15px] font-semibold text-[#03170C]"
          >
            Next
          </button>
        )}
      </div>
    </main>
  );
}
