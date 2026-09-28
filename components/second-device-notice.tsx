"use client";

import { Cloud, TriangleAlert } from "lucide-react";
import { FlowScreen, IconOrb, FlowTitle, FlowBody } from "./app/flow";
import { Button } from "./ui/button";

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
    <FlowScreen>
      <div className="flex flex-1 flex-col justify-center gap-8">
        <IconOrb>
          <Cloud className="size-11" strokeWidth={1.75} />
        </IconOrb>
        <div className="flex flex-col gap-3">
          <FlowTitle>One more thing</FlowTitle>
          <FlowBody>
            This passkey is the only way into your wallet. If iCloud Keychain or Google Password
            Manager sync is on for this device, it&rsquo;s already on your other signed-in devices.
          </FlowBody>
        </div>
        <div className="flex gap-3 rounded-[20px] bg-warning/10 p-4 ring-1 ring-warning/25">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" />
          <p className="text-[13.5px] leading-relaxed text-warning">
            There&rsquo;s no other backup yet. If you lose every device, this wallet can&rsquo;t be recovered.
          </p>
        </div>
      </div>
      <Button size="lg" onClick={onContinue} className="w-full">
        I understand
      </Button>
    </FlowScreen>
  );
}
