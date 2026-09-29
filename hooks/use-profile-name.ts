"use client";

import { useEffect, useState } from "react";

// The display name a person gives themselves. It only lives on this phone
// (localStorage) — never on-chain, never sent anywhere.

const NAME_KEY = "ky_profile_name";
const EVENT = "ky:profile";
export const MAX_NAME_LENGTH = 32;

export function getProfileName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setProfileName(name: string) {
  const clean = name.trim().slice(0, MAX_NAME_LENGTH);
  try {
    if (clean) localStorage.setItem(NAME_KEY, clean);
    else localStorage.removeItem(NAME_KEY);
  } catch {}
  // Every screen showing the name updates at once (home hero, settings).
  window.dispatchEvent(new Event(EVENT));
}

export function useProfileName(): string {
  const [name, setName] = useState("");
  useEffect(() => {
    const sync = () => setName(getProfileName());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return name;
}
