"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Fingerprint, Globe, LogOut } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/hooks/use-passkey-wallet";
import { MAX_NAME_LENGTH, setProfileName, useProfileName } from "@/hooks/use-profile-name";
import { shorten } from "@/lib/format";
import { WalletAvatar } from "./app/screen";
import { Sheet, SheetContent } from "./ui/sheet";
import { Card, CardRows } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card text-muted-foreground">
        {icon}
      </span>
      <span className="flex-1 text-[14px]">{label}</span>
      <span className="text-right text-[14px] text-muted-foreground">{value}</span>
    </div>
  );
}

/** Your profile: the picture, a name you choose, and your wallet. Opened
 * from the avatar on Home and the profile card in Settings. */
export default function ProfileSheet({
  open,
  onOpenChange,
  address,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string | null;
}) {
  const name = useProfileName();
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const router = useRouter();

  // Start each opening from the saved name, with sign-out not armed.
  useEffect(() => {
    if (open) {
      setDraft(name);
      setConfirmingSignOut(false);
    }
  }, [open, name]);

  function doSignOut() {
    signOut();
    onOpenChange(false);
    router.replace("/app");
  }

  const changed = draft.trim() !== name;

  function save(e: React.FormEvent) {
    e.preventDefault();
    setProfileName(draft);
    toast.success(draft.trim() ? "Name saved" : "Name removed");
    (document.activeElement as HTMLElement | null)?.blur();
  }

  async function copy() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — copy it manually instead");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Profile">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-3 text-center">
            <WalletAvatar address={address} size={84} />
            <div>
              <p className="font-display text-[20px] font-extrabold tracking-[-0.02em]">{name || "Your wallet"}</p>
              <p className="font-mono text-[13px] text-muted-foreground">{address ? shorten(address) : "Not connected"}</p>
            </div>
          </div>

          <form onSubmit={save} className="flex flex-col gap-2">
            <label htmlFor="profile-name" className="px-1 text-[13px] font-semibold">
              Your name
            </label>
            <div className="flex gap-2">
              <Input
                id="profile-name"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={MAX_NAME_LENGTH}
                placeholder="e.g. Nimal"
                autoComplete="nickname"
                enterKeyHint="done"
              />
              <Button type="submit" disabled={!changed} className="h-12 px-5">
                Save
              </Button>
            </div>
            <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
              Shown on your Home screen. It stays on this phone — never on-chain, never sent anywhere.
            </p>
          </form>

          {address && (
            <div className="flex flex-col gap-2">
              <p className="px-1 text-[13px] font-semibold">Wallet address</p>
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-left transition-colors active:bg-secondary"
              >
                <span className="flex-1 font-mono text-[12.5px] leading-relaxed break-all text-foreground/90">{address}</span>
                {copied ? <Check className="size-5 shrink-0 text-primary" /> : <Copy className="size-5 shrink-0 text-muted-foreground" />}
              </button>
            </div>
          )}

          <Card className="bg-surface-2 shadow-none">
            <CardRows>
              <Row icon={<Fingerprint className="size-[18px]" />} label="Sign-in" value="Passkey on this device" />
              <Row icon={<Globe className="size-[18px]" />} label="Network" value="Arbitrum Sepolia" />
            </CardRows>
          </Card>

          {/* Two steps, in place — no browser confirm() popup. */}
          {confirmingSignOut ? (
            <div className="flex flex-col gap-3 rounded-2xl bg-destructive/10 p-4 ring-1 ring-destructive/25 duration-200 animate-in fade-in">
              <p className="text-[13px] leading-relaxed">
                Your money stays safe in your wallet. To get back in, sign in with the same passkey.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setConfirmingSignOut(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={doSignOut}>
                  Sign out
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" className="text-destructive" onClick={() => setConfirmingSignOut(true)}>
              <LogOut />
              Sign out
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
