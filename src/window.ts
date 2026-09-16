// The Fidj window, and the answer it relays back.
//
// A subpath of its own because it is neither pure nor a view layer: it drives
// `window.open` and `postMessage`, which every framework reaches for the same
// way. An app on React or Vue uses this exactly as a hand-written shell does.
export {
  openProviderWindow,
  relayProviderAnswer,
  type ProviderWindow,
} from "./provider-window.js";
