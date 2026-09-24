// The entry, as data.
//
// Everything a person is told and every rule deciding what they are told, with
// no markup and no DOM. A screen is a value here: the copy, the state, and
// which controls are live. Rendering it is somebody else's business —
// `@ofidj/entry/dom` renders it as HTML strings, and a React or Vue app renders
// the same value as components without re-deriving a single sentence.
//
// That split is the point. The wording and the rules are what took the arguing;
// a `<label>` is not. When the two lived together the only way to reuse either
// was to accept both, so an app on another view layer had to copy the sentences
// out — which is how the service agreement ended up existing in four versions
// that no test could diff.

export type SigninShape = "button" | "inline" | "both";

// ---------------------------------------------------------------------------
// What a refusal means
// ---------------------------------------------------------------------------

const AGREEMENT_REQUIRED = "agreement_required";

// Whether this refusal means the person owes this app its agreement.
//
// The API answers 409 with `code: agreement_required` and the agreement itself,
// but the SDK's FidjError carries a code and a reason and has no room for a
// body — so the code arrives as a number, as a name, or as the whole body
// squeezed into a string, depending on which call refused. All three mean the
// same thing, and guessing wrong costs a person the screen that lets them in.
export function agreementRequired(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const detail = error as {
    code?: unknown;
    reason?: unknown;
    message?: unknown;
  };
  if (detail.code === 409) return true;
  for (const field of [detail.code, detail.reason, detail.message]) {
    if (typeof field === "string" && field.includes(AGREEMENT_REQUIRED))
      return true;
  }
  return false;
}

// The agreement the refusal carried, which is the one the API compared against.
//
// Fetching it again would usually give the same answer and occasionally not:
// an owner who publishes a new version between the refusal and the refetch
// would have the person accept text the API is about to call stale. Both halves
// are required — a version with no text is nothing to read, and text with no
// version is nothing to record.
export function agreementFromRefusal(
  error: unknown,
): { version: string; text: string } | null {
  if (!agreementRequired(error)) return null;
  const details = (error as { details?: unknown }).details as
    { agreement?: { version?: unknown; text?: unknown } } | undefined;
  const agreement = details?.agreement;
  if (typeof agreement?.version !== "string" || !agreement.version) return null;
  if (typeof agreement?.text !== "string" || !agreement.text) return null;
  return { version: agreement.version, text: agreement.text };
}

// What the SDK says when POST /v3/users answered 201: the account was created
// by this very call, so there is no session and the link is what will make one.
//
// It returns the address rather than a boolean because the wait has to name it,
// and the address the account was created with is the one the link went to —
// not whatever is in the field by the time this is read.
export function verificationPending(error: unknown): { email: string } | null {
  if (!error || typeof error !== "object") return null;
  const detail = error as { reason?: unknown; details?: { email?: unknown } };
  if (detail.reason !== "verification-required") return null;
  const email = detail.details?.email;
  return { email: typeof email === "string" ? email : "" };
}

export function signInErrorMessage(error: unknown) {
  const detail = error as {
    code?: number;
    reason?: unknown;
    message?: unknown;
  };
  const reason =
    typeof detail?.reason === "string"
      ? detail.reason
      : typeof detail?.message === "string"
        ? detail.message
        : "";
  if (detail?.code === 429)
    return "Too many attempts. Please wait before trying again.";
  if (reason === "unknown-user")
    return "We could not sign in to this account. Check the email and password.";
  if (reason === "already exists - inconsistent request")
    return "An account already uses this email. Check the password or sign in instead.";
  if (
    /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|EHOSTUNREACH|network/i.test(
      reason,
    )
  )
    return "We cannot reach Fidj right now. Please try again.";
  return "We could not sign in to this account. Please try again.";
}

// ---------------------------------------------------------------------------
// What an acceptance is worth
// ---------------------------------------------------------------------------

// The rule, with nothing to read it off.
//
// A tick is evidence only if it was live and only if it names a version: the
// version travels with the checkbox so that what is recorded is what was
// displayed, and acceptance of a version nobody was shown is not evidence.
// `@ofidj/entry/dom` reads these three facts off a form element; a React app
// reads them off its own state and asks the same question here.
export function acceptance(state: {
  checked?: boolean;
  disabled?: boolean;
  version?: string;
}): { termsAccepted: true; termsVersion: string } | null {
  if (!state.checked || state.disabled || !state.version) return null;
  return { termsAccepted: true, termsVersion: state.version };
}

// ---------------------------------------------------------------------------
// The screens
// ---------------------------------------------------------------------------

export type EntryControl = {
  label: string;
  // `name`/`value` are what the entry's own form posts, and what tells a
  // submit handler which door was pressed. A framework that does not submit
  // forms can ignore them and dispatch on `id` instead.
  id: string;
  name?: string;
  value?: string;
  kind: "primary" | "secondary" | "quiet";
};

export type ProviderEntryModel = {
  shape: SigninShape;
  lead: string;
  // Absent when the app collects its own credentials and offers no Fidj door.
  door: EntryControl | null;
  // Offered only to a browser that has been here: leaving is what forgets it.
  forget: EntryControl | null;
  // Present only on `both`, where the app's own form hides under a disclosure.
  disclosure: { label: string; controls: string; expanded: boolean } | null;
};

// Both doors, but not side by side.
//
// An app that delegates to Fidj still has people who would rather type an
// address and a password than be sent somewhere, so the credential form stays —
// folded away under a line of text rather than standing in front of the door
// most people should take. Offering the two as equals asked every arrival to
// choose between them, and the one that looked like an ordinary login won by
// looking ordinary.
//
// "Continue with Fidj" alone borrows the grammar of an optional social login —
// that button always sits next to an email and a password — so on an app whose
// accounts *are* Fidj accounts, the missing form reads as something broken. The
// explanation therefore comes before the button, not as reassurance after it,
// and nothing presupposes an account the person may not have yet.
//
// `hint` is passed in rather than read: remembering is a browser fact, and a
// model that reaches for `localStorage` is a model that cannot be rendered on a
// server or tested without one.
export function providerEntryModel(options: {
  title: string;
  hint?: string;
  isFidjItself?: boolean;
  shape?: SigninShape;
  hasCredentials?: boolean;
}): ProviderEntryModel {
  const {
    title,
    hint = "",
    isFidjItself = false,
    shape = "button",
    hasCredentials = false,
  } = options;
  const both = shape === "both" && hasCredentials;

  // The app's own form and nothing else. Nothing is folded away because there
  // is no second way in to fold it under, and the trade-off is stated plainly:
  // on this path it is this site that holds the password.
  if (shape === "inline") {
    return {
      shape,
      lead: isFidjItself
        ? "One account across every app that uses Fidj, and a separate set of choices for each one."
        : `${title} accounts are Fidj accounts. Sign in below — ${title} handles your password itself on this page.`,
      door: null,
      forget: null,
      disclosure: null,
    };
  }

  const lead = hint
    ? `You signed in here with Fidj before. ${title} accounts are Fidj accounts — continue as yourself, or use another.`
    : both
      ? `${title} accounts are Fidj accounts. Fidj asks in a window of its own, so this site never sees your password.`
      : isFidjItself
        ? "One account across every app that uses Fidj, and a separate set of choices for each one. Fidj asks in a window of its own; this page stays where it is."
        : `${title} accounts are Fidj accounts. You will sign in — or create yours — in a Fidj window, so this site never sees your password.`;

  // The accent is the Fidj mark, and this is the one control on the screen that
  // is Fidj's rather than the app's. It is also the door the app would rather
  // people took, and those two happen to want the same thing.
  const door: EntryControl = {
    id: "fidj-entry",
    name: "entry",
    value: "fidj",
    kind: "primary",
    label: hint
      ? `Continue as ${hint}`
      : isFidjItself
        ? "Sign in"
        : "Sign in with Fidj",
  };
  const forget: EntryControl | null = hint
    ? { id: "forget-hint", kind: "quiet", label: "Use a different account" }
    : null;

  return {
    shape,
    lead,
    door,
    forget,
    // Fidj is the only door: it collects the agreement itself, a moment later,
    // on the screen that names the app — and records it with its version.
    disclosure: both
      ? { label: "Inline form", controls: "email-entry", expanded: false }
      : null,
  };
}

export type AgreementModel = {
  heading: string;
  lead: string;
  versionLabel: string;
  version: string;
  text: string;
  checkboxLabel: string;
  submitLabel: string;
  // The tick is what opens the door, and unticking closes it again. A screen
  // that exists only to collect an acceptance has nothing to submit until it
  // has one.
  submitDisabled: boolean;
};

// Screen three. The text and the version come from the app's own agreement, and
// the version travels with the acceptance so that what is recorded is what was
// displayed.
export function agreementModel(
  title: string,
  agreement: { version?: string; text?: string },
  state: { checked?: boolean } = {},
): AgreementModel {
  return {
    heading: "Before you continue",
    lead: `${title} asks you to accept its service agreement. Your optional privacy choices stay separate, and you can change them at any time.`,
    versionLabel: `Version ${agreement.version ?? ""}`,
    version: String(agreement.version ?? ""),
    text: String(agreement.text ?? ""),
    checkboxLabel: `I accept the service agreement for ${title}.`,
    submitLabel: "Sign in",
    submitDisabled: !state.checked,
  };
}

export type VerificationState = {
  email: string;
  resent?: boolean;
  error?: string;
};

export type VerificationWaitModel = {
  status: string;
  email: string;
  fineprint: string;
  notice: { kind: "error" | "info"; text: string } | null;
  resendLabel: string;
};

// The wait, underneath the form that started it.
//
// Creating an account never signs anybody in: the account exists, it has no
// session, and the link is what finishes the sign-in. But that is not a place
// somebody was taken to, so it does not get a screen — it appears below the
// credentials they just submitted, which stay where they are.
//
// That is also what makes a mistyped address recoverable without a control of
// its own: the address field is still on screen, still filled in, still
// editable. Correcting it and pressing Create an account again is the repair,
// and it reads as one because nothing moved.
export function verificationWaitModel(
  state: VerificationState,
): VerificationWaitModel {
  return {
    status: "Your account is created. Waiting for you to open the link sent to",
    email: state.email,
    fineprint:
      "This continues on its own once you have. The link may take a minute, and it sometimes lands in spam. Wrong address? Correct it above and create the account again.",
    notice: state.error
      ? { kind: "error", text: state.error }
      : state.resent
        ? {
            kind: "info",
            text: "The link was sent again. Only the newest one works.",
          }
        : null,
    resendLabel: "Send the link again",
  };
}

export type AccountState = {
  linkToken?: string;
  verificationConfirmed?: boolean;
  emailVerified?: boolean;
  accountEmail?: string;
};

export type AccountField = {
  id: string;
  label: string;
  type: string;
  autocomplete?: string;
  minlength?: number;
  required?: boolean;
};

export type AccountModel = {
  heading: string;
  intro: string;
  fields: AccountField[];
  hint: string;
  submitLabel: string;
  // What to offer instead when the screen has no form to show: a link that was
  // never followed, or one that has already been spent.
  alternative: { text: string; href?: string; label?: string } | null;
  status: string;
  extras: EntryControl[];
};

// The four account screens. My account is shown inside the app; the recovery
// and verification ones are reached without a session and stand alone.
export function accountModel(route: string, state: AccountState): AccountModel {
  const empty: AccountModel = {
    heading: "",
    intro: "",
    fields: [],
    hint: "",
    submitLabel: "",
    alternative: null,
    status: "",
    extras: [],
  };
  if (route === "forgot")
    return {
      ...empty,
      heading: "Reset your password",
      intro:
        "We’ll email you a link to choose a new password for your shared Fidj account.",
      fields: [
        {
          id: "recovery-email",
          label: "Email address",
          type: "email",
          autocomplete: "email",
          required: true,
        },
      ],
      submitLabel: "Send reset link",
    };
  if (route === "reset")
    return {
      ...empty,
      heading: "Choose a new password",
      intro:
        "This changes your Fidj password across all your apps and signs out existing sessions.",
      fields: state.linkToken
        ? [
            {
              id: "new-password",
              label: "New password",
              type: "password",
              autocomplete: "new-password",
              minlength: 12,
              required: true,
            },
            {
              id: "confirm-password",
              label: "Confirm password",
              type: "password",
              autocomplete: "new-password",
              minlength: 12,
              required: true,
            },
          ]
        : [],
      hint: state.linkToken
        ? "Use at least 12 characters (up to 72 UTF-8 bytes)."
        : "",
      submitLabel: state.linkToken ? "Save new password" : "",
      alternative: state.linkToken
        ? null
        : {
            text: "Request a new link if you no longer have an active reset link.",
            href: "#/forgot",
            label: "Request a reset link",
          },
    };
  if (route === "verify")
    return {
      ...empty,
      heading: state.verificationConfirmed
        ? "Email verified"
        : "Verify your email",
      intro: state.verificationConfirmed
        ? "Your account is ready. Return to your app to continue."
        : "Confirm that this email address belongs to you.",
      submitLabel:
        !state.verificationConfirmed && state.linkToken
          ? "Confirm email address"
          : "",
      alternative:
        !state.verificationConfirmed && !state.linkToken
          ? {
              text: "Sign in to your account to request a new verification email.",
            }
          : null,
    };
  return {
    ...empty,
    heading: "Profile",
    intro: "",
    status: state.emailVerified
      ? "Your email address is verified."
      : "Your email is not verified yet.",
    alternative: { text: "", href: "#/forgot", label: "Reset my password" },
    extras: [
      {
        id: "check-verification",
        kind: "secondary",
        label: "Refresh verification status",
      },
      ...(state.emailVerified
        ? []
        : [
            {
              id: "resend-verification",
              kind: "secondary" as const,
              label: "Send verification email",
            },
          ]),
    ],
  };
}

export type CredentialsModel = {
  email: AccountField & { value: string; placeholder: string };
  password: AccountField & { value: string; placeholder: string };
  forgot: { href: string; label: string };
  reveal: EntryControl;
  submit: EntryControl;
  signup: EntryControl;
};

// The passkey door (v3): the first way in, where the passkey can run. The
// email and password stay under it, reached by the divider's words.
export const passkeyDoorModel: EntryControl = {
  id: "entry-passkey",
  name: "entry",
  value: "passkey",
  kind: "primary",
  label: "Continue with a passkey",
};
export const emailDividerLabel = "or with your email";

// A promise of direction, not a feature: drawn, dated, and never a button
// until the wallets exist.
export const walletDoorModel = {
  label: "EU Digital Identity Wallet / France Identité",
  date: "From Dec 2026",
};

// Both doors, and what was already typed. The entry is rebuilt on every render
// and a refused sign-in is a render, so the values come back in rather than
// being lost with the markup that held them.
export function credentialsModel(state: {
  email: string;
  password: string;
}): CredentialsModel {
  return {
    email: {
      id: "email",
      label: "Email",
      type: "email",
      autocomplete: "username",
      value: state.email,
      placeholder: "you@company.com",
    },
    password: {
      id: "password",
      label: "Password",
      type: "password",
      autocomplete: "current-password",
      value: state.password,
      placeholder: "••••••••••",
    },
    forgot: { href: "#/forgot", label: "Forgot?" },
    reveal: { id: "reveal", kind: "quiet", label: "Show" },
    submit: {
      id: "entry-credentials",
      name: "entry",
      value: "credentials",
      kind: "primary",
      label: "Continue",
    },
    signup: {
      id: "entry-signup",
      name: "signup",
      value: "true",
      kind: "secondary",
      label: "Create an account",
    },
  };
}

// A window that opened on its own, over the page somebody was on, owes them the
// way out before it asks for anything. Naming the app they came from is also the
// only thing on this screen that they can check against what they were doing a
// second ago — which is exactly what a page asking for a password should offer.
export function returnNoticeModel(asking: string) {
  return `When you are done, this window closes and takes you back to ${asking}.`;
}

// ---------------------------------------------------------------------------
// The wait resolves by itself
// ---------------------------------------------------------------------------

// Screen two resolves by itself, which means asking. A failed check is not an
// answer: a browser that lost its connection has learned nothing about the
// address, so it keeps waiting rather than reporting anything.
export function pollVerification(options: {
  check: () => Promise<boolean>;
  onVerified: () => void;
  intervalMs?: number;
}) {
  const interval = options.intervalMs ?? 4000;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
  };
  const ask = async () => {
    if (stopped) return;
    let verified = false;
    try {
      verified = await options.check();
    } catch {
      // Nothing was learned. Wait, and ask again.
    }
    if (stopped) return;
    if (verified) {
      options.onVerified();
      return;
    }
    timer = setTimeout(ask, interval);
  };
  timer = setTimeout(ask, interval);
  return stop;
}
