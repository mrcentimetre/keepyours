import Hero from "./hero";

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

        <Hero />
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
        <p className="m-0 flex items-center gap-1.5">
          © 2026 Keep Yours · Built on
          <a
            href="https://arbitrum.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-ink-2 no-underline transition hover:text-[#12aaff]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/arbitrum-logo.svg" alt="" width={14} height={16} className="block h-4 w-auto" />
            Arbitrum
          </a>
        </p>
      </footer>
    </>
  );
}
