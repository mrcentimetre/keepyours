"use client";

import { useEffect, useState } from "react";
import Badge from "./badge";
import { AdvanceIcon, CooldownIcon, SplitIcon } from "./feature-icons";
import WaitlistForm from "./waitlist-form";
import WaitlistTicket from "./waitlist-ticket";

const POINTS = [
  { title: "Split on arrival", body: "Set it once. Every payment splits into spend and keep.", Icon: SplitIcon },
  { title: "72h cooldown", body: "Savings take three days to leave, and cancelling takes one tap.", Icon: CooldownIcon },
  { title: "Advance, not a loan shark", body: "Up to 50% of your savings instantly, repaid from your next payment.", Icon: AdvanceIcon },
];

export default function Hero() {
  const [joined, setJoined] = useState(null); // { name, handle }
  const [leaving, setLeaving] = useState(null);

  // On phones the form is below the fold; bring the pass into view.
  useEffect(() => {
    if (joined) window.scrollTo({ top: 0 });
  }, [joined]);

  function onJoined(who) {
    // The page clears away first, then the pass is handed over on its own.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setJoined(who);
    else setLeaving(who);
  }

  if (joined) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center pt-10 pb-7">
        <WaitlistTicket name={joined.name} handle={joined.handle} />
      </main>
    );
  }

  return (
    <main
      className={`flex flex-1 flex-col items-center justify-center gap-[18px] pt-[42px] pb-7 text-center ${
        leaving ? "animate-leave" : ""
      }`}
      onAnimationEnd={(e) => e.target === e.currentTarget && leaving && setJoined(leaving)}
    >
      <Badge tag="Soon">
        Launching on Arbitrum One
      </Badge>

      <h1 className="mt-1.5 font-display text-[clamp(42px,8.2vw,84px)] leading-[0.98] font-extrabold tracking-[-0.035em] text-balance">
        Get paid.
        <br />
        <em className="bg-linear-[100deg] from-green from-10% to-green-deep to-90% bg-clip-text not-italic text-transparent">
          Keep yours.
        </em>
      </h1>

      <p className="m-0 max-w-[52ch] text-[clamp(15px,1.9vw,18px)] leading-[1.55] text-ink-2">
        You get paid in USDC. Some goes to spending, some goes into savings you can&rsquo;t raid
        at 2am. Need cash before the client pays? Take an advance against your own savings.
      </p>

      <div className="mt-3.5 w-full max-w-[560px] rounded-[28px] border border-white/70 bg-glass px-[26px] pt-[26px] pb-[22px] shadow-glass backdrop-blur-[18px] max-[480px]:px-[18px] max-[480px]:pt-6 max-[480px]:pb-5">
        <WaitlistForm onJoined={onJoined} />
      </div>

      <div className="mt-[22px] grid w-full max-w-[820px] grid-cols-3 gap-3 max-[680px]:grid-cols-1">
        {POINTS.map(({ title, body, Icon }) => (
          <div
            key={title}
            className="relative rounded-[18px] border border-white/65 bg-white/50 p-4 text-left backdrop-blur-[10px]"
          >
            {/* top-right, so the cards stay the same height */}
            <Icon className="absolute top-2.5 right-2.5 size-[34px]" />
            <b className="mb-1 block pr-9 font-display text-[15px]">{title}</b>
            <span className="text-[13.5px] leading-[1.45] text-muted">{body}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
