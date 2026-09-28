// Mock persistence for E3 (docs/BUILD-PLAN.md): these screens are built
// against a fake data layer on purpose, so nothing here waits on contracts.
// Real settings come from the vault contract once E5 wires it in — this
// file is what gets replaced then, nothing else should read localStorage
// for vault state directly.

const SETTINGS_KEY = "ky_vault_settings";

export type VaultSettings = {
  keepBps: number; // 0..10000, e.g. 4000 = 40% kept
  cooldownSeconds: number;
};

export const DEFAULT_SETTINGS: VaultSettings = {
  keepBps: 4000,
  cooldownSeconds: 72 * 60 * 60, // 72h
};

export const COOLDOWN_PRESETS = [
  { label: "72 hours", seconds: 72 * 60 * 60 },
  { label: "7 days", seconds: 7 * 24 * 60 * 60 },
  { label: "14 days", seconds: 14 * 24 * 60 * 60 },
  { label: "30 days", seconds: 30 * 24 * 60 * 60 },
] as const;

export function getVaultSettings(): VaultSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.keepBps !== "number" || typeof parsed.cooldownSeconds !== "number") {
      return null;
    }
    return parsed as VaultSettings;
  } catch {
    return null;
  }
}

export function saveVaultSettings(settings: VaultSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // fine without persistence in a private window; setup just re-asks
  }
}

export function hasCompletedSetup(): boolean {
  return getVaultSettings() !== null;
}
