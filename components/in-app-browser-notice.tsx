"use client";

import { Compass, MoreHorizontal } from "lucide-react";
import { FlowScreen, IconOrb, FlowTitle, FlowBody, BrandMark } from "./app/flow";
import { Button } from "./ui/button";

export default function InAppBrowserNotice({ onContinue }: { onContinue: () => void }) {
  return (
    <FlowScreen glow="warning">
      <BrandMark />
      <div className="flex flex-1 flex-col justify-center gap-8">
        <IconOrb tone="warning">
          <Compass className="size-11" strokeWidth={1.75} />
        </IconOrb>
        <div className="flex flex-col gap-3">
          <FlowTitle>Open in your browser</FlowTitle>
          <FlowBody>
            This looks like it&rsquo;s open inside another app, where passkeys usually don&rsquo;t work.
          </FlowBody>
        </div>
        <ol className="flex flex-col gap-3">
          <li className="flex items-center gap-3 rounded-[18px] bg-card p-4 ring-1 ring-hairline">
            <span className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-[13px] font-bold">1</span>
            <span className="flex-1 text-[14px]">
              Tap <MoreHorizontal className="mx-0.5 inline size-4 align-[-3px]" /> or the share icon in this screen&rsquo;s toolbar
            </span>
          </li>
          <li className="flex items-center gap-3 rounded-[18px] bg-card p-4 ring-1 ring-hairline">
            <span className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-[13px] font-bold">2</span>
            <span className="flex-1 text-[14px]">
              Choose <b>Open in Safari</b> or <b>Open in Chrome</b>
            </span>
          </li>
        </ol>
      </div>
      <Button variant="ghost" size="sm" onClick={onContinue} className="self-center">
        Continue anyway
      </Button>
    </FlowScreen>
  );
}
