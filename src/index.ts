// The Fidj entry: the rules, and every sentence a person is shown.
//
// This root is pure. No DOM, no markup, no view layer — a screen is a value, so
// the same entry can be drawn as HTML strings, as React components or as Vue
// single-file components without any of them re-deriving a rule or re-typing a
// sentence. That is what the package is for: these screens used to live only in
// generator-fidj's template, where shipping them meant generating an app, and
// the alternative — keeping a second copy in step by hand — is what produced
// four versions of the service agreement that no test could diff.
//
// Two subpaths carry what cannot be pure:
//   @ofidj/entry/dom     the HTML renderer and the helpers that drive a document
//   @ofidj/entry/window  the Fidj window and the answer it relays back
export {
  agreementRequired,
  agreementFromRefusal,
  verificationPending,
  signInErrorMessage,
  acceptance,
  providerEntryModel,
  agreementModel,
  verificationWaitModel,
  accountModel,
  credentialsModel,
  passkeyDoorModel,
  emailDividerLabel,
  walletDoorModel,
  returnNoticeModel,
  pollVerification,
  formatDate,
  optionalPurposes,
  type SigninShape,
  type EntryControl,
  type ProviderEntryModel,
  type AgreementModel,
  type VerificationState,
  type VerificationWaitModel,
  type AccountState,
  type AccountField,
  type AccountModel,
  type CredentialsModel,
} from "./model.js";
export { signInHint, rememberSignIn, forgetSignIn } from "./remembered.js";
