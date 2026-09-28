"use client";

import { useEffect, useState } from "react";
import QrCode from "./qr-code";
import OnboardingCarousel, { ONBOARDED_KEY } from "./onboarding-carousel";
import WalletGate from "./wallet-gate";
import InAppBrowserNotice from "./in-app-browser-notice";

const BYPASS_KEY = "ky_continue_in_browser";
const IN_APP_DISMISSED_KEY = "ky_in_app_warning_dismissed";

// Best-effort only: Telegram's own tracker (github.com/TelegramMessenger/
// Telegram-iOS/issues/736) shows it doesn't always add "Telegram" to the UA
// for a plain external link, only reliably for registered Mini Apps — so
// this can miss real cases. Markers checked 28 Sep 2026: Telegram adds
// "Telegram" (iOS suffix, or "Telegram-Android/" prefix); X adds
// "TwitterAndroid" or "Twitter for iPhone". False positives are handled by
// the "Continue anyway" escape hatch, not by trying to be exhaustive.
function detectInAppBrowser(): boolean {
  const ua = navigator.userAgent || "";
  return /Telegram/i.test(ua) || /TwitterAndroid|Twitter for iPhone/i.test(ua);
}

type Platform = "ios" | "android" | "other-mobile" | "desktop";

// Not in lib.dom.d.ts: beforeinstallprompt is a non-standard, Chromium-only event.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS reports as Mac
  if (isIOS) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Mobi/.test(ua)) return "other-mobile";
  return "desktop";
}

function detectStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true // iOS Safari
  );
}

function Logo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-128.png" alt="" width={40} height={40} className="block" />
  );
}

function ContinueInBrowser({ onContinue }: { onContinue: () => void }) {
  return (
    <button
      type="button"
      onClick={onContinue}
      className="text-[13px] text-[#8CA497] underline decoration-[#2C4A3B] underline-offset-4 hover:text-[#BFD8C9]"
    >
      Continue in browser (demo)
    </button>
  );
}

function IosSteps() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-[15px] leading-relaxed text-[#BFD8C9]">
        Tap the <b className="text-[#EAF5EF]">Share</b> icon in Safari&rsquo;s toolbar,
        then <b className="text-[#EAF5EF]">Add to Home Screen</b>.
      </p>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#62E6A0" strokeWidth="2" aria-hidden="true">
        <path d="M12 2v13M12 2l-4 4M12 2l4 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function AndroidSteps({
  deferredPrompt,
  onInstalled,
}: {
  deferredPrompt: BeforeInstallPromptEvent | null;
  onInstalled: () => void;
}) {
  const [installing, setInstalling] = useState(false);

  async function install() {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setInstalling(false);
    if (outcome === "accepted") onInstalled();
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {deferredPrompt && (
        <button
          type="button"
          onClick={install}
          disabled={installing}
          className="rounded-full bg-gradient-to-r from-[#16B862] to-[#62E6A0] px-6 py-3 text-[15px] font-semibold text-[#03170C] disabled:opacity-60"
        >
          {installing ? "Installing…" : "Install Keep Yours"}
        </button>
      )}
      <p className="text-[15px] leading-relaxed text-[#BFD8C9]">
        Or open your browser&rsquo;s menu (⋮) and choose{" "}
        <b className="text-[#EAF5EF]">Add to Home screen</b> or{" "}
        <b className="text-[#EAF5EF]">Install app</b>.
      </p>
    </div>
  );
}

function OtherMobileSteps() {
  return (
    <p className="text-[15px] leading-relaxed text-[#BFD8C9]">
      Open your browser&rsquo;s menu and look for{" "}
      <b className="text-[#EAF5EF]">Add to Home Screen</b> or{" "}
      <b className="text-[#EAF5EF]">Install app</b>.
    </p>
  );
}

function DesktopGate({ url, onContinue }: { url: string; onContinue: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <QrCode value={url} />
      <p className="text-[15px] leading-relaxed text-[#BFD8C9]">
        Scan this with your phone, then add it to your home screen.
      </p>
      <ContinueInBrowser onContinue={onContinue} />
    </div>
  );
}

export default function InstallGate() {
  const [mounted, setMounted] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [bypassed, setBypassed] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [url, setUrl] = useState("");
  const [onboarded, setOnboarded] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [inAppDismissed, setInAppDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStandalone(detectStandalone());
    setPlatform(detectPlatform());
    setInAppBrowser(detectInAppBrowser());
    setUrl(window.location.origin + "/app");
    try {
      setBypassed(localStorage.getItem(BYPASS_KEY) === "1");
      setOnboarded(localStorage.getItem(ONBOARDED_KEY) === "1");
      setInAppDismissed(localStorage.getItem(IN_APP_DISMISSED_KEY) === "1");
    } catch {
      // private-mode storage can throw; default to not bypassed/onboarded
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function continueInBrowser() {
    try {
      localStorage.setItem(BYPASS_KEY, "1");
    } catch {
      // fine without persistence; just won't stick next visit
    }
    setBypassed(true);
  }

  function finishOnboarding() {
    try {
      localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      // fine without persistence; just shows again next visit
    }
    setOnboarded(true);
  }

  function dismissInAppWarning() {
    try {
      localStorage.setItem(IN_APP_DISMISSED_KEY, "1");
    } catch {
      // fine without persistence; just shows again next visit
    }
    setInAppDismissed(true);
  }

  if (!mounted) return null; // avoid a flash before we know the platform

  if (standalone || bypassed) {
    return onboarded ? <WalletGate /> : <OnboardingCarousel onDone={finishOnboarding} />;
  }

  // Checked before the normal install steps: none of those (or passkey
  // creation, later) reliably work inside Telegram/X's in-app browser, so
  // catch it first rather than let someone follow install steps that fail
  // at the passkey step anyway.
  if (inAppBrowser && !inAppDismissed) {
    return <InAppBrowserNotice onContinue={dismissInAppWarning} />;
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <Logo />
        <p className="font-display text-[28px] font-bold">Install Keep Yours</p>
        <p className="max-w-[38ch] text-sm text-[#8CA497]">
          Keep Yours works best as an app on your phone.
        </p>
      </div>

      {platform === "ios" && <IosSteps />}
      {platform === "android" && (
        <AndroidSteps deferredPrompt={deferredPrompt} onInstalled={() => setStandalone(true)} />
      )}
      {platform === "other-mobile" && <OtherMobileSteps />}
      {platform === "desktop" && <DesktopGate url={url} onContinue={continueInBrowser} />}

      {platform !== "desktop" && (
        <div className="pt-2">
          <ContinueInBrowser onContinue={continueInBrowser} />
        </div>
      )}
    </main>
  );
}
