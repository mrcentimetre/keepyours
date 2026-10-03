"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { reportError } from "@/lib/analytics";
import { FlowScreen, IconOrb, FlowTitle, FlowBody } from "@/components/app/flow";
import { Button } from "@/components/ui/button";

/** A screen in /app crashed: say so plainly, report it, and offer a way back. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, "screen_crash");
  }, [error]);

  return (
    <FlowScreen glow="warning">
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <IconOrb tone="warning">
          <TriangleAlert className="size-10" />
        </IconOrb>
        <FlowTitle className="text-[28px]">Something went wrong</FlowTitle>
        <FlowBody className="max-w-[34ch]">
          Your money is safe: it&apos;s on-chain, not in this screen. Try again, and if it keeps happening, tell us
          what you tapped.
        </FlowBody>
      </div>
      <div className="flex flex-col gap-3">
        <Button size="lg" onClick={reset} className="w-full">
          Try again
        </Button>
        <Button variant="ghost" size="sm" onClick={() => window.location.assign("/app/home")} className="self-center">
          Back to Home
        </Button>
      </div>
    </FlowScreen>
  );
}
