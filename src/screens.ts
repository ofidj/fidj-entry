// The screens the entry draws, as markup.
//
// Lifted out of generator-fidj's content.ts, where the only way to ship them
// was to generate an app. What stayed behind is the shell that holds them:
// the sign-in screen nests signin-trust inside its inner div and the
// interaction screen makes it a sibling, so a single shell builder would have
// had to change one of them. That is a decision, not a move.

export const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );

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

// Both doors, and what was already typed. The entry is rebuilt on every render
// and a refused sign-in is a render, so the values come back in rather than
// being lost with the markup that held them.
export function credentialFields(state: { email: string; password: string }) {
  return `<label for="email">Email</label><input id="email" type="email" value="${escape(state.email)}" placeholder="you@company.com" autocomplete="username"><div class="field-head"><label for="password">Password</label><a href="#/forgot">Forgot?</a></div><div class="password-field"><input id="password" type="password" value="${escape(state.password)}" placeholder="••••••••••" autocomplete="current-password"><button type="button" id="reveal" aria-controls="password">Show</button></div><button class="primary" type="submit" name="entry" value="credentials">Continue</button><button class="secondary" type="submit" name="signup" value="true">Create an account</button>`;
}

export type AccountState = {
  linkToken?: string;
  verificationConfirmed?: boolean;
  emailVerified?: boolean;
  accountEmail?: string;
};

// The four account screens. My account is shown inside the app; the recovery
// and verification ones are reached without a session and stand alone.
export function accountForm(route: string, state: AccountState) {
  return    route === "forgot"
      ? `<h2>Reset your password</h2><p>We’ll email you a link to choose a new password for your shared Fidj account.</p><form id="recovery"><label for="recovery-email">Email address</label><input id="recovery-email" type="email" autocomplete="email" required><button class="primary">Send reset link</button></form>`
      : route === "reset"
        ? `<h2>Choose a new password</h2><p>This changes your Fidj password across all your apps and signs out existing sessions.</p>${state.linkToken ? '<form id="recovery"><label for="new-password">New password</label><input id="new-password" type="password" autocomplete="new-password" minlength="12" required><label for="confirm-password">Confirm password</label><input id="confirm-password" type="password" autocomplete="new-password" minlength="12" required><p>Use at least 12 characters (up to 72 UTF-8 bytes).</p><button class="primary">Save new password</button></form>' : '<p>Request a new link if you no longer have an active reset link.</p><a href="#/forgot">Request a reset link</a>'}`
        : route === "verify"
          ? `<h2>${state.verificationConfirmed ? "Email verified" : "Verify your email"}</h2>${state.verificationConfirmed ? "<p>Your account is ready. Return to your app to continue.</p>" : "<p>Confirm that this email address belongs to you.</p>"}${state.verificationConfirmed ? "" : state.linkToken ? '<form id="recovery"><button class="primary">Confirm email address</button></form>' : "<p>Sign in to your account to request a new verification email.</p>"}`
          : `<h2>My Fidj account</h2><p class="account-identity">Signed in as <strong>${escape(state.accountEmail)}</strong></p><p>Your identity is shared across your apps. Privacy choices remain separate for each app.</p><p id="verification-status">${state.emailVerified ? "Your email address is verified." : "Your email is not verified yet."}</p><button id="check-verification">Refresh verification status</button>${state.emailVerified ? "" : '<button id="resend-verification">Send verification email</button>'}<p><a href="#/forgot">Reset my password</a></p>`;
}

// A window that opened on its own, over the page somebody was on, owes them the
// way out before it asks for anything. Naming the app they came from is also the
// only thing on this screen that they can check against what they were doing a
// second ago — which is exactly what a page asking for a password should offer.
export function returnNotice(asking: string) {
  return `<p class="signin-return" role="note">When you are done, this window closes and takes you back to ${escape(asking)}.</p>`;
}
