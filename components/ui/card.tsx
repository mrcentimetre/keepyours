import * as React from "react";
import { cn } from "@/lib/utils";

// React 19 passes `ref` through to function components as a normal prop —
// no forwardRef wrapper needed — but React.ComponentProps<"div"> doesn't
// include it in its type, so it's added explicitly here.
function Card({ className, ref, ...props }: React.ComponentProps<"div"> & { ref?: React.Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      data-slot="card"
      className={cn(
        // Elevation and a hairline ring, not a border: separation comes from
        // the surface stepping up off the page, the way a native app does it.
        "rounded-[22px] bg-card text-card-foreground shadow-card ring-1 ring-hairline",
        className
      )}
      {...props}
    />
  );
}

/** Rows inside a card, divided by hairlines — one card for a list, not one
 * card per item. */
function CardRows({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-rows"
      className={cn("divide-y divide-hairline", className)}
      {...props}
    />
  );
}

export { Card, CardRows };
