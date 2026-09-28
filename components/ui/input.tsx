import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // 16px on purpose: iOS Safari zooms the whole page when a focused
        // input's text is smaller than that.
        "h-12 w-full rounded-2xl bg-surface-2 px-4 text-[16px] text-foreground outline-none ring-1 ring-transparent placeholder:text-muted-foreground transition-shadow focus:ring-ring/60 disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
