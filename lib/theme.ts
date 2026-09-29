// Appearance: Dark (the brand default), Light, or follow the phone.
// The resolved theme lives on <html data-ky-theme="light|dark">, which the
// light token block in app/globals.css keys off.

export type ThemeChoice = "dark" | "light" | "system";

export const THEME_KEY = "ky_theme";

const DARK_BG = "#060E0A";
const LIGHT_BG = "#EEF5F1";

export function getThemeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "system") return v;
  } catch {}
  return "dark";
}

export function setThemeChoice(choice: ThemeChoice) {
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {}
  applyTheme(choice);
}

export function applyTheme(choice: ThemeChoice = getThemeChoice()) {
  const light =
    choice === "light" || (choice === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);
  document.documentElement.dataset.kyTheme = light ? "light" : "dark";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? LIGHT_BG : DARK_BG);
}

/**
 * Runs inline before the app paints (app/app/layout.tsx), so a light-theme
 * user never sees a dark flash. It also swaps the iOS status-bar style:
 * "black-translucent" always draws a WHITE clock, unreadable on a light
 * page, while "default" gives dark text on a light bar. iOS reads that meta
 * when the installed app launches, so a change shows on the next launch.
 */
export const THEME_SCRIPT = `(function(){try{var c=localStorage.getItem("${THEME_KEY}")||"dark";var l=c==="light"||(c==="system"&&matchMedia("(prefers-color-scheme: light)").matches);document.documentElement.dataset.kyTheme=l?"light":"dark";if(l){var s=document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');if(s)s.setAttribute("content","default");var t=document.querySelector('meta[name="theme-color"]');if(t)t.setAttribute("content","${LIGHT_BG}")}}catch(e){}})();`;
