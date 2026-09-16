// What this browser remembers about the last person to sign in here.
//
// Not DOM and not a view layer, so it sits at the root beside the model: a
// React app needs this exactly as much as a hand-written one. It is the only
// browser API the root touches, every call is guarded, and a runtime without
// storage gets "nobody was here" rather than an exception — which is also the
// right answer in a private window.

const hintKey = (appId: string) => "fidj.entry." + appId;

export function signInHint(appId: string) {
  try {
    return localStorage.getItem(hintKey(appId)) || "";
  } catch {
    return "";
  }
}

// Remembered on this app's own origin, about this app's own member: no
// cross-site question is asked, and none is answered. Signing out forgets, so a
// shared browser does not show the next person an address.
export function rememberSignIn(appId: string, label: string) {
  try {
    if (label) localStorage.setItem(hintKey(appId), label);
  } catch {}
}

export function forgetSignIn(appId: string) {
  try {
    localStorage.removeItem(hintKey(appId));
  } catch {}
}
