import {
  agreementModel,
  credentialsModel,
  emailDividerLabel,
  passkeyDoorModel,
  returnNoticeModel,
} from "./model.js";
import { escape } from "./dom.js";

export type OidcInteractionPage = {
  mode: "login" | "waiting" | "consent";
  appTitle: string;
  action: string;
  csrf: string;
  notice?: string;
  email?: string;
  forgotHref?: string;
  googleEnabled?: boolean;
  waitingEmail?: string;
  resent?: boolean;
  notYet?: boolean;
  scopes?: string[];
  agreement?: { version: string; text: string };
  agreementHref?: string;
  termsUri?: string;
  privacyUri?: string;
  recognisedEmail?: string;
  // The passkey door (v3): the page allows no request of its own, so it
  // carries the challenge and posts the authenticator's answer as a form.
  passkey?: { ticket: string; options: unknown };
  // Where the Fidj mark is served from: the provider serves its own, a front
  // end drawing the same screen serves it beside its bundle.
  logoSrc?: string;
};

export const oidcInteractionScript = `(() => {
  const bindPasswordReveal = (root) => {
    root.querySelectorAll("button[aria-controls]").forEach((button) => {
      const field = root.querySelector("#" + button.getAttribute("aria-controls"));
      if (!field) return;
      button.addEventListener("click", () => {
        const hidden = field.type === "password";
        field.type = hidden ? "text" : "password";
        button.textContent = hidden ? "Hide" : "Show";
      });
    });
  };
  const bindAgreement = (root) => {
    const checkbox = root.querySelector('input[name="terms"]');
    const submit = root.querySelector('button[value="continue"]');
    if (!checkbox || !submit) return;
    const update = () => { submit.disabled = !checkbox.checked; };
    checkbox.addEventListener("change", update);
    update();
  };
  // The passkey ceremony, on a page that may not fetch: the options came with
  // the page, the answer leaves with the form.
  const fromB64url = (value) => {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = atob(base64 + "===".slice((base64.length + 3) % 4));
    return Uint8Array.from(bytes, (c) => c.charCodeAt(0)).buffer;
  };
  const toB64url = (buffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
  const bindPasskey = (root) => {
    const button = root.querySelector('button[value="passkey"][data-passkey-options]');
    if (!button) return;
    if (!window.PublicKeyCredential || !navigator.credentials) {
      button.hidden = true;
      return;
    }
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const form = button.form;
      const options = JSON.parse(button.dataset.passkeyOptions);
      const publicKey = {
        ...options,
        challenge: fromB64url(options.challenge),
        allowCredentials: (options.allowCredentials || []).map((c) => ({ ...c, id: fromB64url(c.id) })),
      };
      try {
        const credential = await navigator.credentials.get({ publicKey });
        const r = credential.response;
        form.querySelector('input[name="passkey"]').value = JSON.stringify({
          id: credential.id,
          rawId: toB64url(credential.rawId),
          type: credential.type,
          response: {
            clientDataJSON: toB64url(r.clientDataJSON),
            authenticatorData: toB64url(r.authenticatorData),
            signature: toB64url(r.signature),
            userHandle: r.userHandle ? toB64url(r.userHandle) : undefined,
          },
          clientExtensionResults: {},
        });
        const action = document.createElement("input");
        action.type = "hidden";
        action.name = "action";
        action.value = "passkey";
        form.append(action);
        form.querySelectorAll("[required]").forEach((field) => field.removeAttribute("required"));
        form.submit();
      } catch (e) {
        // Cancelled or refused by the device: the email form is still there.
      }
    });
  };
  bindPasswordReveal(document);
  bindPasskey(document);
  bindAgreement(document);
})();`;

// Scoped to the screen, because a front end draws the same markup inside a
// document that has a stylesheet of its own. The typography reset names the
// scope twice so it outranks a host's element rules, some of which already
// carry a pseudo-class of their own.
export const oidcInteractionStyles = `.oidc-page,.oidc-page *{box-sizing:border-box}.oidc-page{width:min(100%,720px);max-width:none;padding:0;font:16px system-ui;color:#153e37;text-align:left;min-height:calc(100vh - 48px);margin:0 auto;overflow:hidden;border:1px solid #b9ccc0;border-radius:20px;background:white}.oidc-page .oidc-brand{display:flex;align-items:center;gap:16px;padding:18px 28px;background:#173e36;color:white}.oidc-page .oidc-brand img{width:48px;height:48px}.oidc-page .oidc-brand p{margin:0;font-size:21px;font-weight:700;line-height:1.08}.oidc-page section{padding:32px 36px 40px}.oidc-page section>h1{margin:0 0 10px;font-size:30px;line-height:1.15}.oidc-page section>p{line-height:1.45}.oidc-page form{margin-top:24px}.oidc-page label{display:block;margin:20px 0 8px}.oidc-page input,.oidc-page button{width:100%;padding:14px;border:1px solid #b9ccc0;border-radius:10px;font:inherit}.oidc-page button{margin-top:14px;background:#173e36;color:white;cursor:pointer;font-weight:600}.oidc-page .secondary{background:white;color:#173e36}.oidc-page .cancel{border-color:transparent;background:transparent}.oidc-page .notice{margin:0 0 4px;padding:12px 14px;border:1px solid #ef4b42;background:#fdecea;color:#8a1c16;border-radius:8px}.oidc-page .return{margin:0;font-size:14px;color:#3f5c52}.oidc-page .field-head,.oidc-page .password-field{display:flex;align-items:flex-end;gap:12px}.oidc-page .field-head{justify-content:space-between}.oidc-page .field-head label{margin-bottom:0}.oidc-page .field-link{font-size:14px;color:#3f5c52}.oidc-page .password-field input{flex:1}.oidc-page .password-field button{width:auto;margin-top:0}.oidc-page .account-picker{display:grid;grid-template-columns:44px minmax(0,1fr) 24px;align-items:center;gap:12px;padding:12px 14px;border:1px solid #b9ccc0;border-radius:12px;background:#f3f6f1}.oidc-page .account-avatar{display:grid;width:44px;height:44px;place-items:center;border-radius:50%;background:#173e36;color:white;font-size:18px;font-weight:700}.oidc-page .account-copy{display:flex;min-width:0;flex-direction:column;gap:2px}.oidc-page .account-copy small{font-size:12px;color:#3f5c52}.oidc-page .account-email{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.oidc-page .account-check{font-size:20px;font-weight:700}.oidc-page .permission-title{margin:22px 0 8px;font-weight:600}.oidc-page .permission-list{margin:0;padding:12px 14px 12px 36px;border:1px solid #b9ccc0;border-radius:12px}.oidc-page .permission-list li{padding:3px 0}.oidc-page .account-switch{text-align:left}.oidc-page .agreement-choice{display:flex;align-items:flex-start;gap:10px;margin:20px 0 8px}.oidc-page .agreement-choice input{width:auto}.oidc-page .fineprint{margin:6px 0;font-size:14px;color:#3f5c52}.oidc-page .agreement-link{display:inline-block;margin:2px 0 8px;color:#173e36;font-weight:600}@media(max-width:700px){.oidc-page{min-height:100vh;border:0;border-radius:0}.oidc-page .oidc-brand{padding:16px 24px}.oidc-page .oidc-brand img{width:44px;height:44px}.oidc-page .oidc-brand p{font-size:19px}.oidc-page section{padding:26px 24px 34px}.oidc-page section>h1{font-size:26px}}.oidc-page .divider{display:flex;align-items:center;gap:12px;margin:22px 0 0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#3f5c52}.oidc-page .divider::before,.oidc-page .divider::after{content:"";flex:1;height:1px;background:#b9ccc0}.oidc-page button:disabled{border-color:#d4d9d5;background:#d4d9d5;color:#778079;cursor:not-allowed}.oidc-page .agreement-choice a{color:#173e36;font-weight:600}.oidc-page.oidc-page :is(h1,p,label,small,strong,a,li,span,input,button){font-family:inherit;letter-spacing:normal;text-transform:none;text-wrap:wrap}.oidc-page.oidc-page{margin:0 auto;max-width:none;padding:0}.oidc-page.oidc-page :is(h1,p,label,li,strong){color:inherit}.oidc-page.oidc-page label{font-size:inherit;margin:20px 0 8px}.oidc-page.oidc-page .agreement-choice{margin:20px 0 8px}.oidc-page.oidc-page h1{font-weight:700;font-size:30px;line-height:1.15;margin:0 0 10px}.oidc-page.oidc-page .fineprint,.oidc-page.oidc-page .return,.oidc-page.oidc-page .field-link{color:#3f5c52}`;
const documentStyles = `body{margin:0;padding:24px;background:#f3f6f1}@media(max-width:700px){body{padding:0}}`;

const passkeyDoor = (page: OidcInteractionPage) =>
  page.passkey
    ? `<button class="passkey" name="action" value="${escape(passkeyDoorModel.value)}" data-passkey-options="${escape(JSON.stringify(page.passkey.options))}" formnovalidate>${escape(passkeyDoorModel.label)}</button><input type="hidden" name="passkeyTicket" value="${escape(page.passkey.ticket)}"><input type="hidden" name="passkey" value=""><p class="divider"><span>${escape(emailDividerLabel)}</span></p>`
    : "";

const loginFields = (page: OidcInteractionPage) => {
  const model = credentialsModel({ email: page.email || "", password: "" });
  return `${passkeyDoor(page)}<label for="email">${escape(model.email.label)}</label><input id="email" type="email" name="email" value="${escape(model.email.value)}" autocomplete="username" required><div class="field-head"><label for="password">${escape(model.password.label)}</label>${page.forgotHref ? `<a class="field-link" href="${escape(page.forgotHref)}">${escape(model.forgot.label)}</a>` : ""}</div><div class="password-field"><input id="password" type="password" name="password" autocomplete="current-password" required><button type="button" aria-controls="password">${escape(model.reveal.label)}</button></div><button name="action" value="continue">Sign in</button><button class="secondary" name="action" value="signup">Create a Fidj account</button>${page.googleEnabled ? '<button class="secondary" name="action" value="google" formnovalidate>Continue with linked Google account</button>' : ""}<button class="secondary" name="action" value="cancel" formnovalidate>Cancel</button>`;
};

const waitFields = (page: OidcInteractionPage) => {
  const state = page.notYet
    ? "The link has not been opened yet. Open it, then press Continue again."
    : page.resent
      ? "The link was sent again. Only the newest one works."
      : "";
  return `<p class="fineprint">The link may take a minute, and it sometimes lands in spam. Open it, then come back here.</p>${state ? `<p class="fineprint">${state}</p>` : ""}<button name="action" value="continue">Continue</button><button class="secondary" name="action" value="resend">Send the link again</button><button class="secondary" name="action" value="cancel" formnovalidate>Cancel</button>`;
};

const consentFields = (page: OidcInteractionPage) => {
  const agreement = agreementModel(page.appTitle, page.agreement || {});
  const initial = (page.recognisedEmail || "?").trim().charAt(0).toUpperCase();
  const identity = page.recognisedEmail
    ? `<div class="account-picker"><span class="account-avatar" aria-hidden="true">${escape(initial)}</span><span class="account-copy"><small>Signed in with Fidj</small><strong class="account-email">${escape(page.recognisedEmail)}</strong></span><span class="account-check" aria-hidden="true">✓</span></div>`
    : "";
  const agreementChoice =
    page.agreement && page.agreementHref
      ? `<label class="agreement-choice"><input type="checkbox" name="terms" value="true" required> <span>I accept the <a class="agreement-document" href="${escape(page.agreementHref)}" target="_blank" rel="noopener noreferrer">service agreement · version ${escape(page.agreement.version)} ↗</a></span></label>`
      : `<label class="agreement-choice"><input type="checkbox" name="terms" value="true" required> ${escape(agreement.checkboxLabel)}</label>`;
  return `${identity}<p class="permission-title">${escape(page.appTitle)} will receive:</p><ul class="permission-list">${(page.scopes || []).map((scope) => `<li>${escape(scope)}</li>`).join("")}</ul>${agreementChoice}<button name="action" value="continue" disabled>Allow and continue</button><button class="secondary account-switch" name="action" value="switch" formnovalidate>Use another account</button><button class="cancel" name="action" value="cancel" formnovalidate>Cancel</button>`;
};

function interactionCopy(page: OidcInteractionPage) {
  const waiting = page.mode === "waiting";
  const login = page.mode === "login";
  return {
    title: waiting ? "Check your email" : login ? "Sign in" : "Authorize",
    heading: waiting
      ? "Check your email"
      : login
        ? `Sign in to your Fidj account to continue to ${escape(page.appTitle)}.`
        : `Continue to ${escape(page.appTitle)}`,
    lead: waiting
      ? `Your account is created. Waiting for you to open the link sent to <strong>${escape(page.waitingEmail)}</strong>.`
      : "",
    fields: waiting
      ? waitFields(page)
      : login
        ? loginFields(page)
        : consentFields(page),
  };
}

// The screen itself, without a document around it and without a script: the
// provider wraps it in its own page, and Fidj's front end draws it in the
// window an app opened, binding it with `bindOidcInteraction`.
export function oidcInteractionMarkup(page: OidcInteractionPage) {
  const copy = interactionCopy(page);
  const waiting = page.mode === "waiting";
  return `<div class="oidc-page"><header class="oidc-brand"><img src="${escape(page.logoSrc || "/oidc/assets/logo.png")}" alt="Fidj" width="58" height="58"><p>Your identity.<br>Your choices.</p></header><section><h1>${copy.heading}</h1>${copy.lead ? `<p>${copy.lead}</p>` : ""}<p class="return">${escape(returnNoticeModel(page.appTitle))}</p>${waiting || !page.notice ? "" : `<p class="notice" role="alert">${escape(page.notice)}</p>`}<form id="interaction" method="post" action="${escape(page.action)}"><input type="hidden" name="csrf" value="${escape(page.csrf)}">${copy.fields}</form>${page.mode === "login" ? "<p><small>Fidj never shares your password with the app.</small></p>" : ""}</section></div>`;
}

export function oidcInteractionPage(page: OidcInteractionPage) {
  const copy = interactionCopy(page);
  const script =
    page.mode === "waiting"
      ? ""
      : '<script src="/oidc/assets/entry.js" defer></script>';
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${copy.title} · Fidj</title><style>${documentStyles}${oidcInteractionStyles}</style><main>${oidcInteractionMarkup(page)}</main>${script}</html>`;
}
