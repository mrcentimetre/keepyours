import WaitlistForm from "@/components/waitlist-form";

const POINTS = [
  { title: "Split on arrival", body: "Set it once. Every payment splits into spend and keep." },
  { title: "72h cooldown", body: "Savings take three days to leave, and cancelling takes one tap." },
  { title: "Advance, not a loan shark", body: "Up to 50% of your savings instantly, repaid from your next payment." },
];

export default function Home() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 grid place-items-center overflow-hidden"
      >
        <i className="absolute size-[560px] rounded-full border border-dashed border-line" />
        <i className="absolute size-[860px] rounded-full border border-dashed border-line" />
        <i className="absolute size-[1180px] rounded-full border border-solid border-line/50" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 pt-7 pb-6">
        <header className="flex items-center justify-center gap-2.5">
          <a href="/" className="flex items-center gap-3 text-ink no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-128.png" alt="" width={38} height={38} className="block size-[38px]" />
            <span className="font-display text-[19px] font-extrabold tracking-[-0.02em]">
              Keep Yours
            </span>
          </a>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center gap-[18px] pt-[42px] pb-7 text-center">
          <div className="inline-flex items-center gap-[9px] rounded-full border border-line bg-glass px-4 py-2 text-[11.5px] font-semibold tracking-[0.09em] text-ink-2 uppercase shadow-glass backdrop-blur-[14px]">
            <span className="size-[7px] rounded-full bg-green shadow-[0_0_0_3px_rgba(22,184,98,0.18)]" />
            Launching soon on Arbitrum One
          </div>

          <h1 className="mt-1.5 font-display text-[clamp(42px,8.2vw,84px)] leading-[0.98] font-extrabold tracking-[-0.035em] text-balance">
            Get paid.
            <br />
            <em className="bg-linear-[100deg] from-green from-10% to-green-deep to-90% bg-clip-text not-italic text-transparent">
              Keep yours.
            </em>
          </h1>

          <p className="m-0 max-w-[52ch] text-[clamp(15px,1.9vw,18px)] leading-[1.55] text-ink-2">
            You get paid in USDC. Some goes to spending, some goes into savings you can&rsquo;t
            raid at 2am. Need cash before the client pays? Take an advance against your own
            savings.
          </p>

          <div className="mt-3.5 w-full max-w-[560px] rounded-[28px] border border-white/70 bg-glass px-[26px] pt-[26px] pb-[22px] shadow-glass backdrop-blur-[18px] max-[480px]:px-[18px] max-[480px]:pt-6 max-[480px]:pb-5">
            <h2 className="m-0 mb-1.5 font-display text-[19px] font-semibold">Join the waitlist</h2>
            <p className="m-0 mb-[22px] text-sm text-muted">
              Be one of the first testers. No spam, one email when it opens.
            </p>
            <WaitlistForm />
          </div>

          <div className="mt-[22px] grid w-full max-w-[820px] grid-cols-3 gap-3 max-[680px]:grid-cols-1">
            {POINTS.map((p) => (
              <div
                key={p.title}
                className="rounded-[18px] border border-white/65 bg-white/50 p-4 text-left backdrop-blur-[10px]"
              >
                <b className="mb-1 block font-display text-[15px]">{p.title}</b>
                <span className="text-[13.5px] leading-[1.45] text-muted">{p.body}</span>
              </div>
            ))}
          </div>
        </main>
      </div>

      <footer className="relative z-10 flex flex-col items-center gap-3.5 px-5 pt-6 pb-[calc(28px+env(safe-area-inset-bottom,0px))] text-[13px] text-muted">
        <a
          href="https://x.com/keepyoursxyz"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-line bg-white/60 px-4 py-2 font-medium text-ink-2 no-underline backdrop-blur-[10px] transition hover:text-green-deep"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.9 2H22l-7.1 8.1L23.3 22h-6.6l-5.2-6.8L5.6 22H2.5l7.6-8.7L1.1 2h6.8l4.7 6.2L18.9 2Zm-1.1 18h1.7L7.3 3.8H5.5L17.8 20Z" />
          </svg>
          Follow the build @keepyoursxyz
        </a>
        <p className="m-0">© 2026 Keep Yours · Built on Arbitrum</p>
      </footer>
    </>
  );
}
