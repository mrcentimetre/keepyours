"use client";

function Logo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-128.png" alt="" width={40} height={40} className="block" />
  );
}

/**
 * T2.2 — shown once, right after a fresh passkey creation.
 *
 * This is deliberately an EDUCATIONAL screen, not a working recovery
 * mechanism. What's built is a single passkey as the account's only
 * signer (docs/CONTRACTS.md, docs/ARCHITECTURE.md's "Lost devices" note).
 * Adding a real second signer that can also control this same wallet needs
 * a multi-validator setup that doesn't exist yet — building a button that
 * looked like "add a backup device" without that would tell a user they
 * have a working backup when they don't, on a money app. Not doing that.
 *
 * What this screen honestly can say: platform passkeys usually sync on
 * their own (iCloud Keychain, Google Password Manager) to the user's other
 * signed-in devices, if that sync is turned on. So it says that, plainly,
 * and nothing more.
 */
export default function SecondDeviceNotice({ onContinue }: { onContinue: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <Logo />
        <p className="font-display text-[26px] font-bold">One more thing</p>
        <p className="max-w-[38ch] text-[15px] leading-relaxed text-[#8CA497]">
          This passkey is the only way into your wallet. If iCloud Keychain or
          Google Password Manager sync is turned on for this device, it&rsquo;s
          already available on your other signed-in devices.
        </p>
        <p className="max-w-[38ch] text-[15px] leading-relaxed text-[#F4B545]">
          There&rsquo;s no other backup yet. If you lose every device, this
          wallet cannot be recovered.
        </p>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="rounded-full bg-gradient-to-r from-[#16B862] to-[#62E6A0] px-8 py-3.5 text-[15px] font-semibold text-[#03170C]"
      >
        Got it
      </button>
    </main>
  );
}
