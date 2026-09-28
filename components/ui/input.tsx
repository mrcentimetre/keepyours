import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full rounded-2xl border border-border bg-card px-4 text-[14px] text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-ring disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
