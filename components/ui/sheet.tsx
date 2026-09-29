"use client";

import * as React from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

// Bottom sheet (vaul). Secondary flows — showing the QR, reviewing a
// withdrawal before it starts — slide up over the screen they came from
// instead of navigating away, the way a native wallet does it.
//
// The content carries its own `ky-app` class: vaul portals it to <body>,
// outside the app layout's .ky-app div, so without it none of the
// --card/--primary/... tokens would resolve inside the sheet.

function Sheet(props: React.ComponentProps<typeof Drawer.Root>) {
  return <Drawer.Root {...props} />;
}

function SheetContent({
  className,
  children,
  title,
  description,
}: {
  className?: string;
  children: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <Drawer.Portal>
      <Drawer.Overlay className="ky-app fixed inset-0 z-40 bg-black/65 backdrop-blur-[3px]" />
      <Drawer.Content
        className={cn(
          "ky-app fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88dvh] max-w-[460px] flex-col rounded-t-[28px] bg-card text-foreground shadow-float outline-none ring-1 ring-hairline",
          className
        )}
      >
        <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-foreground/15" aria-hidden="true" />
        <div className="overflow-y-auto overscroll-contain px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+20px)]">
          <Drawer.Title className="font-display text-[20px] font-extrabold tracking-[-0.02em]">
            {title}
          </Drawer.Title>
          {description ? (
            <Drawer.Description className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {description}
            </Drawer.Description>
          ) : (
            <Drawer.Description className="sr-only">{title}</Drawer.Description>
          )}
          <div className="mt-5">{children}</div>
        </div>
      </Drawer.Content>
    </Drawer.Portal>
  );
}

export { Sheet, SheetContent };
