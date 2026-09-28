import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[15px] font-semibold transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        // The brand gradient — every screen's main call-to-action.
        brand: "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[0_8px_24px_-8px_rgba(22,184,98,0.45)] hover:brightness-105",
        outline: "border border-border bg-transparent text-foreground hover:border-secondary hover:bg-secondary/40",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-secondary/40",
        destructive: "border border-destructive/40 bg-transparent text-destructive hover:bg-destructive/10",
        link: "text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground",
      },
      size: {
        default: "h-[52px] px-6",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-14 px-8",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "brand",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
