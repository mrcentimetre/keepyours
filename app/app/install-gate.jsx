"use client";

import { useEffect, useState } from "react";
import QrCode from "./qr-code";

const BYPASS_KEY = "ky_continue_in_browser";

function detectPlatform() {
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS reports as Mac
  if (isIOS) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Mobi/.test(ua)) return "other-mobile";
  return "desktop";
}

function detectStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true // iOS Safari
  );
}

function Logo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-128.png" alt="" width={40} height={40} className="block" />
  );
}

function ContinueInBrowser({ onContinue }) {
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

/** Placeholder for what T3.1+ renders once installed/bypassed. */
function InsideApp() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-8 text-center">
      <Logo />
      <p className="font-display text-2xl font-bold">You&rsquo;re in</p>
      <p className="max-w-[42ch] text-sm text-[#8CA497]">
        Setup, home, withdraw and advance screens land next. This is a placeholder.
      </p>
    </main>
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

function AndroidSteps({ deferredPrompt, onInstalled }) {
  const [installing, setInstalling] = useState(false);

  async function install() {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
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

function DesktopGate({ url, onContinue }) {
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
  const [platform, setPlatform] = useState("desktop");
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    setMounted(true);
    setStandalone(detectStandalone());
    setPlatform(detectPlatform());
    setUrl(window.location.origin + "/app");
    try {
      setBypassed(localStorage.getItem(BYPASS_KEY) === "1");
    } catch {
      // private-mode storage can throw; default to not bypassed
    }

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
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

  if (!mounted) return null; // avoid a flash before we know the platform

  if (standalone || bypassed) return <InsideApp />;

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
