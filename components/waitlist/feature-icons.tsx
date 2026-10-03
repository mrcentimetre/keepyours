// Small clay-style icons for the three feature cards. Pure SVG; the loops live
// in globals.css and only run when the visitor allows motion.

import type { SVGProps } from "react";

const RIM = "#0b7a41";

type IconProps = SVGProps<SVGSVGElement>;

export function Shadow({ id }: { id: string }) {
  return (
    <filter id={id} x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="1.6" stdDeviation="1.4" floodColor="#08452c" floodOpacity="0.28" />
    </filter>
  );
}

// A coin seen from slightly above: a face on top of a thin rim.
export function Coin({ cx, cy, face, rim = RIM, r = 13 }: { cx: number; cy: number; face: string; rim?: string; r?: number }) {
  const ry = r * 0.42;
  const depth = r * 0.34;
  return (
    <g>
      <ellipse cx={cx} cy={cy + depth} rx={r} ry={ry} fill={rim} />
      <rect x={cx - r} y={cy} width={r * 2} height={depth} fill={rim} />
      <ellipse cx={cx} cy={cy} rx={r} ry={ry} fill={face} />
      <ellipse cx={cx} cy={cy} rx={r * 0.62} ry={ry * 0.58} fill="none" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.1" />
      <ellipse cx={cx - r * 0.34} cy={cy - ry * 0.4} rx={r * 0.34} ry={ry * 0.22} fill="#ffffff" opacity="0.6" />
    </g>
  );
}

export function SplitIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <defs>
        <Shadow id="ic-split-sh" />
        <linearGradient id="ic-split-keep" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#62E6A0" />
          <stop offset="1" stopColor="#16B862" />
        </linearGradient>
        <linearGradient id="ic-split-spend" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#bfeed5" />
        </linearGradient>
      </defs>
      <g filter="url(#ic-split-sh)">
        <g className="ic-split-l">
          <Coin cx={15} cy={20} face="url(#ic-split-spend)" rim="#8fcfae" r={12} />
        </g>
        <g className="ic-split-r">
          <Coin cx={33} cy={27} face="url(#ic-split-keep)" r={12} />
        </g>
      </g>
    </svg>
  );
}

export function CooldownIcon(props: IconProps) {
  const r = 10;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <defs>
        <Shadow id="ic-cool-sh" />
        <linearGradient id="ic-cool-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dcefe4" />
        </linearGradient>
        <linearGradient id="ic-cool-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#62E6A0" />
          <stop offset="1" stopColor={RIM} />
        </linearGradient>
      </defs>
      <g filter="url(#ic-cool-sh)">
        <rect x="21.5" y="6" width="5" height="4" rx="1.4" fill={RIM} />
        <rect x="23" y="9" width="2" height="3" fill={RIM} />
        <circle cx="24" cy="27" r="15" fill="url(#ic-cool-rim)" />
        <circle cx="24" cy="27" r="12.4" fill="url(#ic-cool-body)" />
        {/* amber always means waiting */}
        <circle
          className="ic-cool-fill"
          cx="24"
          cy="27"
          r={r}
          fill="none"
          stroke="#F4B545"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * 0.3}
          transform="rotate(-90 24 27)"
        />
        <g className="ic-cool-hand">
          <line x1="24" y1="27" x2="24" y2="19" stroke="#060E0A" strokeWidth="2" strokeLinecap="round" />
        </g>
        <circle cx="24" cy="27" r="1.8" fill="#060E0A" />
        <path d="M14 21a12 12 0 0 1 7-6" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function AdvanceIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <defs>
        <Shadow id="ic-adv-sh" />
        <linearGradient id="ic-adv-coin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#62E6A0" />
          <stop offset="1" stopColor="#16B862" />
        </linearGradient>
        <linearGradient id="ic-adv-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#bfeed5" />
        </linearGradient>
      </defs>
      <g filter="url(#ic-adv-sh)">
        <Coin cx={24} cy={35} face="url(#ic-adv-coin)" r={14} />
        <Coin cx={24} cy={29.5} face="url(#ic-adv-coin)" r={14} />
        <g className="ic-adv-lift">
          <Coin cx={24} cy={24} face="url(#ic-adv-top)" rim="#8fcfae" r={14} />
        </g>
        <path
          className="ic-adv-arrow"
          d="M24 10V2.5m0 0-4 4m4-4 4 4"
          fill="none"
          stroke="#16B862"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
