import WaitlistForm from "./waitlist-form";

export default function Home() {
  return (
    <>
      <div className="rings" aria-hidden="true">
        <i /><i /><i />
      </div>

      <div className="shell">
        <header>
          <a className="logo" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" width={38} height={38} />
            <span>Keep Yours</span>
          </a>
        </header>

        <main>
          <div className="badge">
            <span className="dot" /> Launching soon on Arbitrum One
          </div>

          <h1>
            Get paid.
            <br />
            <em>Keep yours.</em>
          </h1>

          <p className="sub">
            You get paid in USDC. Some goes to spending, some goes into savings you
            can&rsquo;t raid at 2am. Need cash before the client pays? Take an advance
            against your own savings.
          </p>

          <div className="card">
            <h2>Join the waitlist</h2>
            <p>Be one of the first testers. No spam, one email when it opens.</p>
            <WaitlistForm />
          </div>

          <div className="points">
            <div className="point">
              <b>Split on arrival</b>
              <span>Set it once. Every payment splits into spend and keep.</span>
            </div>
            <div className="point">
              <b>72h cooldown</b>
              <span>Savings take three days to leave, and cancelling takes one tap.</span>
            </div>
            <div className="point">
              <b>Advance, not a loan shark</b>
              <span>Up to 50% of your savings instantly, repaid from your next payment.</span>
            </div>
          </div>
        </main>
      </div>

      <footer>
        <span>© 2026 Keep Yours</span>
        <span className="sep">·</span>
        <a href="https://x.com/keepyours" target="_blank" rel="noopener noreferrer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.9 2H22l-7.1 8.1L23.3 22h-6.6l-5.2-6.8L5.6 22H2.5l7.6-8.7L1.1 2h6.8l4.7 6.2L18.9 2Zm-1.1 18h1.7L7.3 3.8H5.5L17.8 20Z" />
          </svg>
          @keepyours
        </a>
        <span className="sep">·</span>
        <a href="https://github.com/mrcentimetre/keepyours" target="_blank" rel="noopener noreferrer">
          github
        </a>
        <span className="sep">·</span>
        <span>on Arbitrum</span>
      </footer>
    </>
  );
}
