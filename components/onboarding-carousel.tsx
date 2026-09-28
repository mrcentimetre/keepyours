"use client";

import { useRef, useState } from "react";
import { ArrowDownLeft, ArrowRight, Lock, Wallet, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import SlideToConfirm from "./slide-to-confirm";
import CountdownRing from "./countdown-ring";
import { FlowScreen, FlowTitle, FlowBody, BrandMark } from "./app/flow";

export const ONBOARDED_KEY = "ky_onboarded";

// ── Illustrations ─────────────────────────────────────────────
// Built from the app's own pieces (cards, the countdown ring, the fee bar)
// so what someone sees here is what they'll actually use. Amounts are a
// worked example, labelled as one — not anyone's real balance.

function Float({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-[20px] bg-card/90 ring-1 ring-white/[0.08] shadow-float backdrop-blur-md",
        className
      )}
    >
      {children}
    </div>
  );
}

function SplitArt() {
  return (
    <div className="relative mx-auto flex h-[300px] w-full max-w-[320px] flex-col items-center justify-center">
      <Float className="flex w-[230px] items-center gap-3 px-4 py-3.5">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
          <ArrowDownLeft className="size-5" />
        </span>
        <div>
          <p className="text-[12px] text-muted-foreground">Client payment</p>
          <p className="font-mono text-[18px] font-semibold tabular-nums">$100.00</p>
        </div>
      </Float>
      <svg width="200" height="56" viewBox="0 0 200 56" fill="none" aria-hidden="true" className="my-1">
        <path d="M100 0 V16 C100 34 40 30 40 56" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 6" />
        <path d="M100 0 V16 C100 34 160 30 160 56" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 6" />
      </svg>
      <div className="flex gap-4">
        <Float className="w-[140px] -rotate-3 px-4 py-3">
          <p className="text-[11px] font-bold tracking-[0.1em] text-accent uppercase">Spend · 60%</p>
          <p className="mt-1 font-mono text-[20px] font-semibold tabular-nums">$60.00</p>
        </Float>
        <Float className="w-[140px] rotate-3 px-4 py-3 ring-primary/40">
          <p className="flex items-center gap-1 text-[11px] font-bold tracking-[0.1em] text-primary uppercase">
            <Lock className="size-3" /> Keep · 40%
          </p>
          <p className="mt-1 font-mono text-[20px] font-semibold tabular-nums">$40.00</p>
        </Float>
      </div>
    </div>
  );
}

function CooldownArt() {
  return (
    <div className="relative mx-auto flex h-[300px] items-center justify-center">
      <CountdownRing progress={0.64} color="var(--warning)" size={230} stroke={14}>
        <p className="font-mono text-[40px] font-semibold tracking-[-0.03em] text-warning tabular-nums">72h</p>
        <p className="text-[12px] text-muted-foreground">waiting period</p>
      </CountdownRing>
      <Float className="absolute -right-12 bottom-0 flex items-center gap-2 px-3 py-2">
        <span className="size-2 rounded-full bg-warning" />
        <span className="text-[12px] font-semibold">Cancel any time</span>
      </Float>
    </div>
  );
}

function AdvanceArt() {
  return (
    <div className="relative mx-auto flex h-[300px] w-full max-w-[320px] flex-col items-center justify-center gap-4">
      <Float className="w-[260px] p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10.5px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Available now</p>
            <p className="mt-1 font-mono text-[28px] font-semibold tabular-nums">$70.00</p>
          </div>
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Zap className="size-5" />
          </span>
        </div>
        <div className="mt-4 flex h-2 gap-1 overflow-hidden rounded-full">
          <div className="flex-1 bg-primary" />
          <div className="flex-1 bg-warning/60" />
          <div className="flex-1 bg-warning" />
        </div>
        <p className="mt-2 text-[12px] font-semibold text-primary">Free for 30 days</p>
      </Float>
      <Float className="flex items-center gap-2 px-3 py-2">
        <Wallet className="size-4 text-accent" />
        <span className="text-[12px] font-semibold">Repaid from your next payment</span>
      </Float>
    </div>
  );
}

const SLIDES = [
  {
    art: <SplitArt />,
    headline: "Every payment splits itself",
    body: "Set it once. Each USDC payment divides into what you spend and what you keep — the moment it lands.",
  },
  {
    art: <CooldownArt />,
    headline: "Savings wait before they leave",
    body: "What you keep takes a waiting period to withdraw, and only ever goes to your own wallet. Cancel any time.",
  },
  {
    art: <AdvanceArt />,
    headline: "Client paying late? Advance it",
    body: "Borrow up to half of what you've kept, free for the first 30 days. Paid back from your next payment.",
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
    // element stops delivering move events to this div.
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    // Rubber-band at the ends instead of sliding into empty space.
    const dx = e.clientX - startXRef.current;
    const atEdge = (i === 0 && dx > 0) || (last && dx < 0);
    setDragX(atEdge ? dx * 0.25 : dx);
  }

  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    const threshold = widthRef.current * 0.18;
    if (dragX <= -threshold && !last) setI(i + 1);
    else if (dragX >= threshold && i > 0) setI(i - 1);
    setDragX(0);
  }

  return (
    <FlowScreen className="px-0">
      <div className="flex h-10 items-center justify-between px-6">
        <BrandMark />
        {!last && (
          <button type="button" onClick={onDone} className="text-[14px] font-semibold text-muted-foreground hover:text-foreground">
            Skip
          </button>
        )}
      </div>

      <div
        ref={trackRef}
        className="flex flex-1 touch-pan-y overflow-hidden select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="flex w-full shrink-0"
          style={{
            transform: `translateX(calc(${-i * 100}% + ${dragX}px))`,
            transition: dragging ? "none" : "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {SLIDES.map((s, idx) => (
            <div
              key={s.headline}
              aria-hidden={idx !== i}
              className="flex w-full shrink-0 flex-col justify-end gap-8 px-6 pb-6"
            >
              <div
                className="flex flex-1 items-center justify-center transition-opacity duration-500"
                style={{ opacity: idx === i ? 1 : 0.3 }}
              >
                {s.art}
              </div>
              <div className="flex flex-col gap-3">
                <FlowTitle>{s.headline}</FlowTitle>
                <FlowBody className="max-w-[34ch]">{s.body}</FlowBody>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-6 px-6">
        {last ? (
          <SlideToConfirm label="Get started" onConfirm={onDone} />
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {SLIDES.map((s, idx) => (
                <button
                  key={s.headline}
                  type="button"
                  onClick={() => setI(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    idx === i ? "w-7 bg-primary" : "w-2 bg-secondary"
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setI(i + 1)}
              aria-label="Next"
              className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary text-primary-foreground shadow-brand transition-transform active:scale-90"
            >
              <ArrowRight className="size-6" strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </FlowScreen>
  );
}
