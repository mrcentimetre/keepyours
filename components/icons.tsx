// One place for the icons reused across the app shell (bottom nav, home
// screen's action row, settings, keypad) — lucide-react gives a single
// consistent stroke weight/style instead of the hand-drawn SVGs this file
// used to hold, each drawn slightly differently. Export names/signatures
// stay the same on purpose so call sites didn't need to change.

import { House, ArrowUpFromLine, ArrowDownToLine, Zap, Settings, Copy, Search, Bell, Delete } from "lucide-react";

type IconProps = { active?: boolean };

function stroke(active?: boolean) {
  return active ? "var(--primary)" : "var(--muted-foreground)";
}

export function HomeIcon({ active }: IconProps) {
  return <House size={22} color={stroke(active)} strokeWidth={2} aria-hidden="true" />;
}

/** Money leaving: arrow up and out. */
export function WithdrawIcon({ active }: IconProps) {
  return <ArrowUpFromLine size={22} color={stroke(active)} strokeWidth={2} aria-hidden="true" />;
}

/** Quick cash: distinct glyph from the withdraw/receive arrows. */
export function AdvanceIcon({ active }: IconProps) {
  return <Zap size={22} color={stroke(active)} strokeWidth={2} aria-hidden="true" />;
}

export function SettingsIcon({ active }: IconProps) {
  return <Settings size={22} color={stroke(active)} strokeWidth={2} aria-hidden="true" />;
}

/** Money arriving: mirror of WithdrawIcon. */
export function ReceiveIcon() {
  return <ArrowDownToLine size={20} color="var(--primary)" strokeWidth={2} aria-hidden="true" />;
}

export function CopyIcon() {
  return <Copy size={20} color="var(--primary)" strokeWidth={2} aria-hidden="true" />;
}

export function SearchIcon() {
  return <Search size={18} color="var(--muted-foreground)" strokeWidth={2} aria-hidden="true" />;
}

export function BellIcon() {
  return <Bell size={18} color="var(--muted-foreground)" strokeWidth={2} aria-hidden="true" />;
}

export function BackspaceIcon() {
  return <Delete size={20} strokeWidth={2} aria-hidden="true" />;
}
