"use client";

import { useEffect, useState } from "react";
import { Copy, Share2, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent } from "./ui/sheet";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import QrCode from "./qr-code";

export default function GetPaidSheet({
  open,
  onOpenChange,
  address,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function copy() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — select the address and copy it instead");
    }
  }

  async function share() {
    if (!address) return;
    try {
      await navigator.share({ title: "My Keep Yours address", text: address });
    } catch {
      // the person closed the share sheet; nothing to do
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title="Get paid"
        description="Share this with a client. Every payment splits into spend and keep the moment it arrives."
      >
        {address ? (
          <div className="flex flex-col items-center gap-5">
            <Badge variant="warning">USDC on Arbitrum Sepolia · testnet</Badge>
            <QrCode value={address} size={200} />
            <p className="w-full rounded-2xl bg-surface-2 px-4 py-3 text-center font-mono text-[13px] leading-relaxed break-all text-foreground/90 select-all">
              {address}
            </p>
            <div className="grid w-full grid-cols-2 gap-3">
              <Button onClick={copy} className={canShare ? "" : "col-span-2"}>
                {copied ? <Check /> : <Copy />}
                {copied ? "Copied" : "Copy"}
              </Button>
              {canShare && (
                <Button onClick={share} variant="secondary">
                  <Share2 />
                  Share
                </Button>
              )}
            </div>
            <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
              Only send USDC on this network. Anything else sent here may be lost.
            </p>
          </div>
        ) : (
          // Never fall back to the wallet address: money sent there skips the split.
          <p className="flex items-center justify-center gap-2 py-6 text-center text-[14px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Getting your address…
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
