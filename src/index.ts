// The Fidj entry, in one place.
//
// Everything here was lifted verbatim out of generator-fidj's template, where
// it could only ship by being generated. It is a package now so that the
// console can import the same screens a generated app renders, instead of the
// two being kept in step by hand — which is how the service agreement ended up
// existing in four copies that no test could diff.
export {
  agreementMarkup,
  acceptedAgreement,
  signInErrorMessage,
  bindAgreement,
  providerEntry,
  signInHint,
  rememberSignIn,
  forgetSignIn,
  showEmailEntry,
  type SigninShape,
} from "./service-agreement.js";
export {
  openProviderWindow,
  relayProviderAnswer,
  type ProviderWindow,
} from "./provider-window.js";
export { showVersionBadge } from "./version.js";
export {
  escape,
  masthead,
  highlightCells,
  badgeStrip,
  credentialFields,
  accountForm,
  returnNotice,
  type AccountState,
} from "./screens.js";
