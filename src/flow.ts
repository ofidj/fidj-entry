import { escape } from "./screens.js";

// The entry flow, in three screens.
//
// Screen one asks for an email and a password and gates neither button. Screen
// two is the wait a new account owes its address. Screen three is the agreement,
// on a screen of its own, whose submit stays read-only until it is ticked.
//
// The order matters for a reason that is not cosmetic: an agreement asked on
// screen one records nothing, because on the create path the account it would be
// recorded against does not exist yet.

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

export type VerificationState = {
  email: string;
  resent?: boolean;
  error?: string;
};

// Screen two. Creating an account never signs anybody in: the account exists,
// it has no session, and the link is what finishes the sign-in.
//
// What a person needs here is not reassurance but the two things they will
// reach for when the mail does not arrive — send it again, and fix the address
// they mistyped. Both are on the screen rather than behind a support page.
export function verificationWait(state: VerificationState) {
  const notice = state.error
    ? `<p role="alert" class="error">${escape(state.error)}</p>`
    : state.resent
      ? `<p class="fineprint">The link was sent again. Only the newest one works.</p>`
      : "";
  return `<h2>Confirm your email</h2>
  <p role="status" class="verification-wait"><span class="spinner" aria-hidden="true"></span>Waiting for you to open the link sent to <strong>${escape(state.email)}</strong>.</p>
  <p class="fineprint">This screen continues on its own once you have. The link may take a minute, and it sometimes lands in spam.</p>
  ${notice}
  <button type="button" id="resend-verification">Send the link again</button>
  <button type="button" id="change-address" class="quiet">Use a different address</button>`;
}

// Screen three. The text and the version come from the app's own agreement, and
// the version travels on the checkbox so that what is recorded is what was
// displayed — acceptance of a version nobody was shown is not evidence.
export function agreementScreen(
  title: string,
  agreement: { version?: string; text?: string },
) {
  return `<h2>Before you continue</h2>
  <p class="signin-lead">${escape(title)} asks you to accept its service agreement. Your optional privacy choices stay separate, and you can change them at any time.</p>
  <p class="fineprint">Version ${escape(agreement.version)}</p>
  <div class="agreement-text" tabindex="0">${escape(agreement.text)}</div>
  <label class="agreement-choice"><input id="service-agreement" type="checkbox" required aria-required="true" data-version="${escape(agreement.version)}"><span>I accept the service agreement for ${escape(title)}.</span></label>
  <button class="primary" type="submit" disabled>Sign in</button>`;
}

// The tick is what opens the door, and unticking closes it again. This is the
// rule generator-fidj's README always claimed and its code never had:
// bindAgreement gates on whether the agreement has *loaded*, which is the right
// rule for a checkbox standing beside a password and the wrong one for a screen
// that exists only to collect it.
export function bindAgreementScreen(form: HTMLFormElement | null) {
  if (!form) return;
  const checkbox = form.querySelector<HTMLInputElement>("#service-agreement");
  if (!checkbox) return;
  const submits = form.querySelectorAll<HTMLButtonElement>(
    'button[type="submit"]',
  );
  const update = () =>
    submits.forEach((button) => {
      button.disabled = !checkbox.checked;
    });
  checkbox.addEventListener("change", update);
  update();
}

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
