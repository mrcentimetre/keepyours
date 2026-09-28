import * as React from "react";

/** A circular progress ring. `progress` is 0..1 (how much of the waiting
 * period has passed); the arc fills clockwise from the top. */
export default function CountdownRing({
  progress,
  color,
  size = 232,
  stroke = 12,
  children,
}: {
  progress: number;
  color: string;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* overflow visible: the arc's glow (drop-shadow) otherwise gets cut
          off in a hard square at the SVG's own bounds. */}
      <svg width={size} height={size} className="-rotate-90 overflow-visible" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 10px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
