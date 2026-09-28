import { cn } from "@/lib/utils";

/** A shimmer block shaped like the real content, shown while a screen
 * reads localStorage on mount instead of a blank flash. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-2xl bg-surface-2", className)}
      {...props}
    />
  );
}

export { Skeleton };
