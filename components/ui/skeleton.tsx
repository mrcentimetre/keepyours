import { cn } from "@/lib/utils";

/** A shimmer block shaped like the real content, shown while a screen
 * reads localStorage on mount (before then, `!mounted` returned null
 * outright — a blank flash instead of anything indicating a load). */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-xl bg-secondary/60", className)}
      {...props}
    />
  );
}

export { Skeleton };
