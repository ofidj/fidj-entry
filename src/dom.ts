// The entry, as markup and as behaviour.
//
// One renderer of the model in `@ofidj/entry`, for the shells that build pages
// out of strings. Every sentence on these screens comes from the model rather
// than from here — that is the property worth keeping, because it is what makes
// a React or Vue app render the *same* entry instead of a similar one.
//
// What stayed out of the model is the shell that holds the screens: the sign-in
// screen nests signin-trust inside its inner div and the interaction screen
// makes it a sibling, so a single shell builder would have had to change one of
// them. That is a decision, not a move.

import {
  accountModel,
  agreementModel,
  credentialsModel,
  providerEntryModel,
  returnNoticeModel,
  signInHint,
  verificationWaitModel,
  type AccountState,
  type EntryControl,
  type SigninShape,
  type VerificationState,
} from "./index.js";

export const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );

const attribute = (name: string, value?: string | number | boolean) =>
  value === undefined || value === false || value === ""
    ? ""
    : ` ${name}="${escape(value)}"`;

const button = (control: EntryControl, extraClass = "") => {
  const classes = [
    control.kind === "primary"
      ? "primary"
      : control.kind === "secondary"
        ? "secondary"
        : "quiet",
    extraClass,
  ]
    .filter(Boolean)
    .join(" ");
  // A control the entry's own form posts is a submit; one that only changes
  // what is on screen is not, and saying so is what keeps a disclosure from
  // opening a second window.
  const type = control.name ? "submit" : "button";
  return `<button class="${classes}" type="${type}"${attribute("id", control.name ? "" : control.id)}${attribute("name", control.name)}${attribute("value", control.value)}>${escape(control.label)}</button>`;
};

// The app's own mark beside its own name, decorative because the name is right
// there: every shell opens with this.
export function masthead(logo: string, title: string) {
  return `<header class="signin-masthead"><img class="app-mark" src="${escape(logo)}" alt=""><strong>${escape(title)}</strong></header>`;
}

export function highlightCells(
  entries?: Array<{ heading: string; body: string }>,
) {
  if (!entries?.length) return "";
  return `<div class="signin-highlights">${entries
    .map(
      (entry, index) =>
        `<article><p class="eyebrow">${String(index + 1).padStart(2, "0")}</p><h2>${escape(entry.heading)}</h2><p>${escape(entry.body)}</p></article>`,
    )
    .join("")}</div>`;
}

export function badgeStrip(entries?: string[]) {
  if (!entries?.length) return "";
  return `<footer class="signin-badges">${entries
    .map((entry) => `<span>${escape(entry)}</span>`)
    .join("")}</footer>`;
}

export function credentialFields(state: { email: string; password: string }) {
  const model = credentialsModel(state);
  return (
    `<label for="email">${escape(model.email.label)}</label><input id="email" type="email" value="${escape(model.email.value)}" placeholder="${escape(model.email.placeholder)}" autocomplete="username">` +
    `<div class="field-head"><label for="password">${escape(model.password.label)}</label><a href="${escape(model.forgot.href)}">${escape(model.forgot.label)}</a></div>` +
    `<div class="password-field"><input id="password" type="password" value="${escape(model.password.value)}" placeholder="${escape(model.password.placeholder)}" autocomplete="current-password"><button type="button" id="reveal" aria-controls="password">${escape(model.reveal.label)}</button></div>` +
    `<button class="primary" type="submit" name="entry" value="credentials">${escape(model.submit.label)}</button>` +
    `<button class="secondary" type="submit" name="signup" value="true">${escape(model.signup.label)}</button>`
  );
}

// The four account screens, drawn from the model that decides which of them has
// a form to show.
export function accountForm(route: string, state: AccountState) {
  const model = accountModel(route, state);
  const fields = model.fields
    .map(
      (field) =>
        `<label for="${escape(field.id)}">${escape(field.label)}</label><input id="${escape(field.id)}" type="${escape(field.type)}"${attribute("autocomplete", field.autocomplete)}${attribute("minlength", field.minlength)}${field.required ? " required" : ""}>`,
    )
    .join("");
  const form = model.submitLabel
    ? `<form id="recovery">${fields}${model.hint ? `<p>${escape(model.hint)}</p>` : ""}<button class="primary">${escape(model.submitLabel)}</button></form>`
    : "";
  const alternative = model.alternative
    ? `${model.alternative.text ? `<p>${escape(model.alternative.text)}</p>` : ""}${model.alternative.href ? `<a href="${escape(model.alternative.href)}">${escape(model.alternative.label)}</a>` : ""}`
    : "";
  if (route === "forgot" || route === "reset" || route === "verify")
    return `<h2>${escape(model.heading)}</h2><p>${escape(model.intro)}</p>${form}${alternative}`;
  // My account keeps its own shape: an identity line, a status the page
  // refreshes in place, and the controls that act on it.
  return (
    `<h2>${escape(model.heading)}</h2>` +
    `<p class="account-identity">Signed in as <strong>${escape(state.accountEmail)}</strong></p>` +
    `<p>${escape(model.intro)}</p>` +
    `<p id="verification-status">${escape(model.status)}</p>` +
    model.extras
      .map(
        (control) =>
          `<button id="${escape(control.id)}">${escape(control.label)}</button>`,
      )
      .join("") +
    `<p><a href="${escape(model.alternative!.href)}">${escape(model.alternative!.label)}</a></p>`
  );
}

export function returnNotice(asking: string) {
  return `<p class="signin-return" role="note">${escape(returnNoticeModel(asking))}</p>`;
}

// The entry every app that delegates to the provider renders. The shape logic
// lives in the model; what is here is the markup and the one browser fact the
// model refuses to reach for itself — what this browser remembers.
export function providerEntry(
  title: string,
  appId: string,
  credentials: string,
  isFidjItself = false,
  shape: SigninShape = "button",
) {
  const model = providerEntryModel({
    title,
    hint: signInHint(appId),
    isFidjItself,
    shape,
    hasCredentials: Boolean(credentials),
  });
  const lead = `<p class="signin-lead">${escape(model.lead)}</p>`;
  if (!model.door) return lead + credentials;
  const door = button(model.door, "fidj-entry");
  const forget = model.forget
    ? `<button type="button" id="${escape(model.forget.id)}" class="quiet">${escape(model.forget.label)}</button>`
    : "";
  if (!model.disclosure) return lead + door + forget;
  // Both doors. The app's own one is a second thought for the person who wants
  // it, which is what a disclosure is for: it costs one click and takes nothing
  // away, where a second button of equal weight cost everybody a decision.
  return (
    lead +
    door +
    forget +
    `<div class="signin-alternate"><button type="button" id="use-email" class="signin-toggle" aria-expanded="${model.disclosure.expanded}" aria-controls="${escape(model.disclosure.controls)}"><span class="signin-toggle-label">${escape(model.disclosure.label)}<span class="caret" aria-hidden="true"></span></span></button>
  <div id="${escape(model.disclosure.controls)}" hidden>${credentials}</div></div>`
  );
}

// Screen three, drawn. The version travels on the checkbox so that what is
// recorded is what was displayed.
export function agreementScreen(
  title: string,
  agreement: { version?: string; text?: string },
) {
  const model = agreementModel(title, agreement);
  return `<h2>${escape(model.heading)}</h2>
  <p class="signin-lead">${escape(model.lead)}</p>
  <p class="fineprint">${escape(model.versionLabel)}</p>
  <div class="agreement-text" tabindex="0">${escape(model.text)}</div>
  <label class="agreement-choice"><input id="service-agreement" type="checkbox" required aria-required="true" data-version="${escape(model.version)}"><span>${escape(model.checkboxLabel)}</span></label>
  <button class="primary" type="submit"${model.submitDisabled ? " disabled" : ""}>${escape(model.submitLabel)}</button>`;
}

// Screen two, drawn under the form that started it.
export function verificationWait(state: VerificationState) {
  const model = verificationWaitModel(state);
  const notice = model.notice
    ? model.notice.kind === "error"
      ? `<p role="alert" class="error">${escape(model.notice.text)}</p>`
      : `<p class="fineprint">${escape(model.notice.text)}</p>`
    : "";
  return `<div class="verification-wait">
  <p role="status"><span class="spinner" aria-hidden="true"></span>${escape(model.status)} <strong>${escape(model.email)}</strong>.</p>
  <p class="fineprint">${escape(model.fineprint)}</p>
  ${notice}
  <button type="button" id="resend-verification">${escape(model.resendLabel)}</button>
  </div>`;
}

// ---------------------------------------------------------------------------
// Reading and driving a real document
// ---------------------------------------------------------------------------

// The acceptance, read off the form that collected it. The rule it applies is
// `acceptance()` in the model; what is here is where the three facts are found.
export function acceptedAgreement(form: HTMLFormElement) {
  const checkbox = form.querySelector<HTMLInputElement>("#service-agreement");
  if (!checkbox?.checked || checkbox.disabled || !checkbox.dataset.version)
    return null;
  return { termsAccepted: true, termsVersion: checkbox.dataset.version };
}

// The tick is what opens the door, and unticking closes it again. This is the
// rule generator-fidj's README always claimed and its code never had:
// bindAgreement gated on whether the agreement had *loaded*, which is the right
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
    submits.forEach((element) => {
      element.disabled = !checkbox.checked;
    });
  checkbox.addEventListener("change", update);
  update();
}

// Opening the app's own form takes the space the Fidj door was using.
//
// The two are alternatives, not a list, and watching one fold away as the other
// arrives is what says so — where a form appearing underneath a button that is
// still there reads as "and also". The toggle stays put through both states, so
// it ends up labelling whichever one is on screen: a caret pointing down at a
// form that is not here yet, and up at the one it would put away.
export function showEmailEntry(open: boolean, focus = false) {
  const fields = document.getElementById("email-entry");
  const toggle = document.getElementById("use-email");
  if (!fields || !toggle) return;
  toggle.setAttribute("aria-expanded", String(open));
  fields.hidden = !open;
  const door = document.querySelector<HTMLButtonElement>(".fidj-entry");
  if (door) {
    door.classList.toggle("is-folded", open);
    // Out of the tab order and out of the accessibility tree the moment it
    // starts leaving: something mid-fold is not something to press, and an
    // animation is not what decides that.
    if (open) door.setAttribute("aria-hidden", "true");
    else door.removeAttribute("aria-hidden");
    door.tabIndex = open ? -1 : 0;
  }
  if (open && focus) document.getElementById("email")?.focus();
}

export function showVersionBadge(version: string, apiEndpoint?: string): void {
  if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version || "")) return;
  const badge = document.createElement("div");
  badge.className = "fidj-version";
  badge.setAttribute("aria-label", `Fidj version ${version}`);
  badge.textContent = `fidj@${version}`;
  document.body.append(badge);
  if (apiEndpoint) {
    void fetch(`${apiEndpoint.replace(/\/$/, "")}/status`)
      .then((response) => (response.ok ? response.json() : null))
      .then((status) => {
        const apiVersion = status?.version || status?.built;
        if (!apiVersion) return;
        badge.textContent = `fidj@${version} · API ${apiVersion}`;
        badge.setAttribute(
          "aria-label",
          `Fidj version ${version}, API version ${apiVersion}`,
        );
      })
      .catch(() => undefined);
  }
}
