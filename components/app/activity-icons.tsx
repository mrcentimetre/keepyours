// The rest of the activity icon set, in the same clay style as the waitlist's
// feature icons: a coin, plus a small badge saying what happened to it.

import type { SVGProps } from "react";
import { Coin, Shadow } from "../waitlist/feature-icons";

type IconProps = SVGProps<SVGSVGElement>;

const GREEN = "#16B862";
const NIGHT = "#0b1f15";
const MUTED = "#8CA497";
const AMBER = "#F4B545";

// Shared gradients. Same ids on every copy is fine: the definitions are identical.
function Faces() {
  return (
    <defs>
      <Shadow id="ic-act-sh" />
      <linearGradient id="ic-act-green" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#62E6A0" />
        <stop offset="1" stopColor={GREEN} />
      </linearGradient>
      <linearGradient id="ic-act-white" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#d6efe2" />
      </linearGradient>
    </defs>
  );
}

/** The corner badge: a filled circle with a white ring and a white glyph. */
function Badge({ fill, children }: { fill: string; children: React.ReactNode }) {
  return (
    <g>
      <circle cx="35" cy="34" r="8.5" fill="#ffffff" />
      <circle cx="35" cy="34" r="7" fill={fill} />
      <g fill="none" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </g>
  );
}

function CoinWithBadge({ face, rim, badge, glyph, ...props }: IconProps & { face: string; rim?: string; badge: string; glyph: React.ReactNode }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <Faces />
      <g filter="url(#ic-act-sh)">
        <Coin cx={21} cy={22} face={face} rim={rim} r={15} />
        <Badge fill={badge}>{glyph}</Badge>
      </g>
    </svg>
  );
}

function StackWithBadge({ badge, glyph, ...props }: IconProps & { badge: string; glyph: React.ReactNode }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" {...props}>
      <Faces />
      <g filter="url(#ic-act-sh)">
        <Coin cx={21} cy={28} face="url(#ic-act-green)" r={14} />
        <Coin cx={21} cy={20} face="url(#ic-act-white)" rim="#8fcfae" r={14} />
        <Badge fill={badge}>{glyph}</Badge>
      </g>
    </svg>
  );
}

/** Money that landed straight in the wallet. */
export function ReceivedIcon(props: IconProps) {
  return <CoinWithBadge face="url(#ic-act-green)" badge={GREEN} glyph={<path d="M35 30v7.5m0 0-3-3m3 3 3-3" />} {...props} />;
}

/** Sent out of the wallet. */
export function SentIcon(props: IconProps) {
  return <CoinWithBadge face="url(#ic-act-white)" rim="#8fcfae" badge={NIGHT} glyph={<path d="M32 37l6-6m0 0h-4.6m4.6 0v4.6" />} {...props} />;
}

/** Savings that finished their waiting period and reached the wallet. */
export function WithdrawnIcon(props: IconProps) {
  return <CoinWithBadge face="url(#ic-act-green)" badge={GREEN} glyph={<path d="M31.6 34.2l2.4 2.4 4.6-4.8" />} {...props} />;
}

/** A withdrawal stopped before it left: the money stayed in savings. */
export function CancelledIcon(props: IconProps) {
  return <CoinWithBadge face="url(#ic-act-white)" rim="#b9cfc3" badge={MUTED} glyph={<path d="M32.2 31.2l5.6 5.6m0-5.6-5.6 5.6" />} {...props} />;
}

/** An advance paid back. */
export function RepaidIcon(props: IconProps) {
  return <StackWithBadge badge={GREEN} glyph={<path d="M38.5 34h-7m0 0 2.8-2.8M31.5 34l2.8 2.8" />} {...props} />;
}

/** An advance taken from savings after day 90. Amber: it happened because of a wait. */
export function SettledIcon(props: IconProps) {
  return (
    <StackWithBadge
      badge={AMBER}
      glyph={
        <>
          <rect x="31.8" y="33.2" width="6.4" height="4.6" rx="1" fill="#ffffff" stroke="none" />
          <path d="M33.2 33.2v-1.4a1.8 1.8 0 0 1 3.6 0v1.4" />
        </>
      }
      {...props}
    />
  );
}
