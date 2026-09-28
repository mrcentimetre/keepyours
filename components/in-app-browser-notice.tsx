"use client";

function Logo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-128.png" alt="" width={40} height={40} className="block" />
  );
}

export default function InAppBrowserNotice({ onContinue }: { onContinue: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <Logo />
        <p className="font-display text-[26px] font-bold">Open in your browser</p>
        <p className="max-w-[38ch] text-[15px] leading-relaxed text-[#8CA497]">
          This looks like it&rsquo;s open inside another app. Passkeys usually
          don&rsquo;t work there. Look for <b className="text-[#EAF5EF]">⋯</b> or
          a share icon in this screen&rsquo;s own toolbar, then{" "}
          <b className="text-[#EAF5EF]">Open in Safari</b> or{" "}
          <b className="text-[#EAF5EF]">Open in Chrome</b>.
        </p>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="text-[13px] text-[#8CA497] underline decoration-[#2C4A3B] underline-offset-4 hover:text-[#BFD8C9]"
      >
        Continue anyway
      </button>
    </main>
  );
}
