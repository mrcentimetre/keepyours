"use client";

import { useEffect, useState } from "react";
import { Download, EllipsisVertical, Share, Smartphone, SquarePlus } from "lucide-react";
import QrCode from "./qr-code";
import { FlowScreen, IconOrb, FlowTitle, FlowBody, BrandMark } from "./app/flow";
import { Button } from "./ui/button";
import OnboardingCarousel, { ONBOARDED_KEY } from "./onboarding-carousel";
import WalletGate from "./wallet-gate";
import InAppBrowserNotice from "./in-app-browser-notice";

// Installing is required. The only way past the gate in a browser tab is
// /app?demo=1, shared with hackathon judges on a laptop; never shown in the UI.
// (A new key on purpose: the old visible "continue in browser" choice is ignored.)
const BYPASS_KEY = "ky_demo_bypass";
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

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-[18px] bg-card p-4 ring-1 ring-hairline">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[13px] font-bold">
        {n}
      </span>
      <span className="flex-1 text-[14px] leading-snug">{children}</span>
    </li>
  );
}

function IosSteps() {
  return (
    <ol className="flex flex-col gap-3">
      <Step n={1}>
        Tap <Share className="mx-0.5 inline size-4 align-[-3px] text-accent" /> <b>Share</b> in Safari&rsquo;s toolbar
      </Step>
      <Step n={2}>
        Choose <SquarePlus className="mx-0.5 inline size-4 align-[-3px] text-accent" /> <b>Add to Home Screen</b>
      </Step>
      <Step n={3}>Open Keep Yours from your home screen</Step>
    </ol>
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
    <div className="flex flex-col gap-3">
      {deferredPrompt && (
        <Button onClick={install} disabled={installing} className="w-full">
          <Download />
          {installing ? "Installing…" : "Install Keep Yours"}
        </Button>
      )}
      <ol className="flex flex-col gap-3">
        <Step n={1}>
          {deferredPrompt ? "Or open" : "Open"} your browser&rsquo;s menu{" "}
          <EllipsisVertical className="inline size-4 align-[-3px] text-accent" />
        </Step>
        <Step n={2}>
          Choose <b>Add to Home screen</b> or <b>Install app</b>
        </Step>
      </ol>
    </div>
  );
}

function OtherMobileSteps() {
  return (
    <ol className="flex flex-col gap-3">
      <Step n={1}>Open your browser&rsquo;s menu</Step>
      <Step n={2}>
        Look for <b>Add to Home Screen</b> or <b>Install app</b>
      </Step>
    </ol>
  );
}

function DesktopGate({ url }: { url: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[24px] bg-card p-6 text-center ring-1 ring-hairline shadow-card">
      <QrCode value={url} size={180} />
      <p className="max-w-[30ch] text-[14px] leading-relaxed text-muted-foreground">
        Scan with your phone&rsquo;s camera, then add it to your home screen.
      </p>
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
      if (new URLSearchParams(window.location.search).get("demo") === "1") {
        localStorage.setItem(BYPASS_KEY, "1");
      }
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
    <FlowScreen>
      <BrandMark />
      <div className="flex flex-1 flex-col justify-center gap-8 py-8">
        {platform !== "desktop" && (
          <IconOrb>
            <Smartphone className="size-11" strokeWidth={1.75} />
          </IconOrb>
        )}
        <div className="flex flex-col gap-3">
          <FlowTitle>{platform === "desktop" ? "Open it on your phone" : "Install Keep Yours"}</FlowTitle>
          <FlowBody>
            Keep Yours is a phone app. Installed, it opens full screen and your passkey stays on
            your device.
          </FlowBody>
        </div>

        {platform === "ios" && <IosSteps />}
        {platform === "android" && (
          <AndroidSteps deferredPrompt={deferredPrompt} onInstalled={() => setStandalone(true)} />
        )}
        {platform === "other-mobile" && <OtherMobileSteps />}
        {platform === "desktop" && <DesktopGate url={url} />}
      </div>
    </FlowScreen>
  );
}
