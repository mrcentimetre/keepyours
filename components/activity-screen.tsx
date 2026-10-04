"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCachedAddress } from "@/hooks/use-passkey-wallet";
import { useVault } from "@/hooks/use-vault";
import { useActivity } from "@/hooks/use-activity";
import { isHydrated } from "@/lib/hydrated";
import ActivityList from "./activity-list";
import { Screen, ScreenHeader } from "./app/screen";
import { Skeleton } from "./ui/skeleton";

/** Everything that's happened on the vault, newest first. Home shows only the latest few. */
export default function ActivityScreen() {
  const [returning] = useState(isHydrated);
  const [address, setAddress] = useState<string | null>(() => (returning ? getCachedAddress() : null));
  const [now, setNow] = useState(Date.now());
  const { state: vault } = useVault(address);
  const { items } = useActivity(address, vault?.address ?? null);

  useEffect(() => {
    setAddress(getCachedAddress());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Screen className="gap-5 pb-[calc(env(safe-area-inset-bottom)+16px)]">
      <Link
        href="/app/home"
        transitionTypes={["nav-back"]}
        className="-mb-2 -ml-1 inline-flex w-fit items-center gap-0.5 text-[15px] font-semibold text-muted-foreground active:text-foreground"
      >
        <ChevronLeft className="size-5" /> Home
      </Link>
      <ScreenHeader title="Activity" subtitle="Everything on your vault and wallet. Tap one to see it on-chain." />
      {items === null ? (
        <Skeleton className="h-[320px]" />
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-[14px] text-muted-foreground">Nothing yet.</p>
      ) : (
        <ActivityList items={items} now={now} />
      )}
    </Screen>
  );
}
