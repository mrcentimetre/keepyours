import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-[18px] shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        // The brand gradient — each screen's one main call-to-action.
        brand: "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-brand hover:brightness-105",
        // White pill, for the primary action sitting on the green hero.
        white: "bg-foreground text-background hover:bg-white",
        // Frosted, for secondary actions on the hero.
        glass: "bg-white/12 text-white ring-1 ring-white/20 backdrop-blur-md hover:bg-white/18",
        secondary: "bg-surface-2 text-foreground hover:bg-secondary",
        outline: "ring-1 ring-border bg-transparent text-foreground hover:bg-surface-2",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-surface-2",
        destructive: "bg-destructive/12 text-destructive ring-1 ring-destructive/30 hover:bg-destructive/18",
        link: "text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground",
      },
      size: {
        default: "h-14 px-6 text-[15px]",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-16 px-8 text-[16px]",
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
