import { cn } from "@/lib/utils";

const SRC = {
  square: "/brand/contour-lines-square.png",
  banner: "/brand/contour-lines-banner.png",
};

/**
 * The brand's contour lines as a stencil: the PNG is black lines on
 * transparent, used as a CSS mask, so the colour comes from a token
 * (--contour by default) and the same art works in light and dark.
 * Place it first inside a `relative overflow-hidden` box; content after
 * it needs `relative` to sit on top.
 */
export function Contour({
  variant = "square",
  color = "var(--contour)",
  position = "center",
  className,
}: {
  variant?: keyof typeof SRC;
  color?: string;
  position?: string;
  className?: string;
}) {
  const mask = `url(${SRC[variant]}) ${position} / cover no-repeat`;
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{ backgroundColor: color, mask, WebkitMask: mask }}
    />
  );
}
