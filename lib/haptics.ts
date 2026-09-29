// A light tap felt in the hand on each key press.
//
// Android: the Vibration API. iOS Safari has no Vibration API, but since
// iOS 18 toggling an <input type="checkbox" switch> plays the system
// "selection" haptic, and a label click inside a user gesture toggles it.
// Older iOS simply does nothing.

let label: HTMLLabelElement | null = null;

function iosSwitch(): HTMLLabelElement {
  if (label) return label;
  label = document.createElement("label");
  label.setAttribute("aria-hidden", "true");
  label.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  return label;
}

export function haptic() {
  if (typeof window === "undefined") return;
  try {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(8);
      return;
    }
    iosSwitch().click();
  } catch {}
}
