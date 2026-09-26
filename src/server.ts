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
export const oidcInteractionStyles = `.oidc-page,.oidc-page *{box-sizing:border-box}.oidc-page{width:min(100%,560px);max-width:none;padding:0;font:15px/1.5 "IBM Plex Sans",system-ui,-apple-system,sans-serif;color:#14110f;text-align:left;min-height:calc(100vh - 48px);margin:0 auto;overflow:hidden;border:1px solid #e4ded7;border-radius:2px;background:#ffffff}.oidc-page .oidc-brand{display:flex;align-items:center;gap:14px;padding:16px 28px;background:#14110f;color:#fbfaf8}.oidc-page .oidc-brand img{width:36px;height:36px}.oidc-page .oidc-brand p{margin:0;font-family:"Instrument Serif",Georgia,"Times New Roman",serif;font-size:20px;font-weight:400;line-height:1.1}.oidc-page section{padding:30px 32px 36px}.oidc-page section>p{line-height:1.5;color:#4a4540}.oidc-page form{margin-top:20px}.oidc-page label{display:block;margin:18px 0 7px;font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#6b655f}.oidc-page input,.oidc-page button{width:100%;padding:12px 14px;border:1px solid #dfd9d2;border-radius:2px;font:inherit;background:#ffffff;color:#14110f}.oidc-page input:focus{outline:none;border-color:#14110f}.oidc-page button{margin-top:12px;background:#14110f;border-color:#14110f;color:#fbfaf8;cursor:pointer;font-weight:600}.oidc-page .secondary{background:transparent;border-color:#dfd9d2;color:#14110f;font-weight:500}.oidc-page .cancel{border-color:transparent;background:transparent;color:#6b655f;font-weight:500}.oidc-page .notice{margin:0 0 4px;padding:12px 14px;border:1px solid #e8d9d6;border-left:3px solid #b8352c;background:#fdf7f6;color:#8c2a22;border-radius:2px}.oidc-page .return{margin:0;font-size:13px;color:#6b655f}.oidc-page .field-head,.oidc-page .password-field{display:flex;align-items:flex-end;gap:12px}.oidc-page .field-head{justify-content:space-between}.oidc-page .field-head label{margin-bottom:7px}.oidc-page .field-link{font-size:13px;color:#6b655f}.oidc-page .password-field input{flex:1}.oidc-page .password-field button{width:auto;margin-top:0;background:transparent;border-color:#dfd9d2;color:#14110f;font-weight:500}.oidc-page .account-picker{display:grid;grid-template-columns:40px minmax(0,1fr) 24px;align-items:center;gap:12px;padding:12px 14px;border:1px solid #e4ded7;border-radius:2px;background:#f5f1ec}.oidc-page .account-avatar{display:grid;width:40px;height:40px;place-items:center;border-radius:50%;background:#14110f;color:#fbfaf8;font-size:16px;font-weight:600}.oidc-page .account-copy{display:flex;min-width:0;flex-direction:column;gap:2px}.oidc-page .account-copy small{font-size:12px;color:#6b655f}.oidc-page .account-email{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.oidc-page .account-check{font-size:18px;font-weight:600}.oidc-page .permission-title{margin:22px 0 8px;font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#6b655f}.oidc-page .permission-list{margin:0;padding:10px 14px 10px 32px;border:1px solid #e4ded7;border-radius:2px}.oidc-page .permission-list li{padding:3px 0}.oidc-page .account-switch{text-align:left}.oidc-page .agreement-choice{display:flex;align-items:flex-start;gap:10px;margin:20px 0 8px}.oidc-page .agreement-choice input{width:auto;accent-color:#14110f}.oidc-page .fineprint{margin:6px 0;font-size:13px;color:#6b655f}.oidc-page a{color:#14110f;text-decoration:underline;text-decoration-color:#dfd9d2;text-underline-offset:3px}@media(max-width:700px){.oidc-page{min-height:100vh;border:0}.oidc-page .oidc-brand{padding:14px 20px}.oidc-page section{padding:24px 20px 30px}.oidc-page section>h1{font-size:28px}}.oidc-page .divider{display:flex;align-items:center;gap:12px;margin:20px 0 0;font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#6b655f}.oidc-page .divider::before,.oidc-page .divider::after{content:"";flex:1;height:1px;background:#e4ded7}.oidc-page button:disabled{opacity:.45;cursor:not-allowed}.oidc-page .agreement-choice a{font-weight:600}.oidc-page.oidc-page :is(h1,p,small,strong,a,li,span,input,button){letter-spacing:normal;text-transform:none;text-wrap:wrap}.oidc-page.oidc-page :is(p,small,strong,a,li,span,input,button){font-family:inherit}.oidc-page.oidc-page{margin:0 auto;max-width:none;padding:0}.oidc-page.oidc-page :is(h1,li,strong){color:inherit}.oidc-page.oidc-page label:not(.agreement-choice){font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#6b655f;margin:18px 0 7px}.oidc-page.oidc-page .agreement-choice{margin:20px 0 8px;font-family:inherit;font-size:14px;letter-spacing:normal;text-transform:none;color:#14110f}.oidc-page.oidc-page h1{font-family:"Instrument Serif",Georgia,"Times New Roman",serif;font-weight:400;font-size:32px;line-height:1.1;margin:0 0 10px;color:#14110f}.oidc-page.oidc-page .fineprint,.oidc-page.oidc-page .return,.oidc-page.oidc-page .field-link{color:#6b655f}`;
const documentStyles = `body{margin:0;padding:24px;background:#fbfaf8}@media(max-width:700px){body{padding:0}}`;

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
