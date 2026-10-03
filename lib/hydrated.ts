// True once the app has loaded in this session. Screens use it to tell a
// first open (match the server render, show a skeleton) from coming back to a
// screen (render cached data straight away, no skeleton, no fade).

let hydrated = false;

export function isHydrated(): boolean {
  return hydrated;
}

export function markHydrated() {
  hydrated = true;
}
