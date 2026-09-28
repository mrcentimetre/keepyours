"use client";

import { useState } from "react";

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
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];

  function next() {
    if (last) onDone();
    else setI(i + 1);
  }

  return (
    <main className="flex min-h-dvh flex-col p-8">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onDone}
          className="text-[13px] text-[#8CA497] hover:text-[#BFD8C9]"
        >
          Skip
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-[#12211A] border border-[#1E3428]">
          {slide.icon}
        </div>
        <p className="font-display text-[26px] font-bold">{slide.headline}</p>
        <p className="max-w-[36ch] text-[15px] leading-relaxed text-[#8CA497]">{slide.body}</p>
      </div>

      <div className="flex flex-col items-center gap-5 pb-4">
        <div className="flex gap-2">
          {SLIDES.map((s, idx) => (
            <span
              key={s.headline}
              className={
                "h-1.5 rounded-full transition-all " +
                (idx === i ? "w-6 bg-[#62E6A0]" : "w-1.5 bg-[#2C4A3B]")
              }
            />
          ))}
        </div>
        <button
          type="button"
          onClick={next}
          className="w-full max-w-[320px] rounded-full bg-gradient-to-r from-[#16B862] to-[#62E6A0] py-3.5 text-[15px] font-semibold text-[#03170C]"
        >
          {last ? "Get started" : "Next"}
        </button>
      </div>
    </main>
  );
}
