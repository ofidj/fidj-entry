import {
  agreementModel,
  credentialsModel,
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
  const bindAgreementWindow = (root) => {
    root.querySelectorAll("a.agreement-document").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        window.open(link.href, "fidj-agreement", "popup,width=640,height=720,left=40,top=40,noopener");
      });
    });
  };
  bindPasswordReveal(document);
  bindAgreement(document);
  bindAgreementWindow(document);
})();`;

const baseStyles = `*{box-sizing:border-box}body{margin:0;padding:24px;font:16px system-ui;color:#153e37;background:#f3f6f1}main{width:min(100%,720px);min-height:calc(100vh - 48px);margin:0 auto;overflow:hidden;border:1px solid #b9ccc0;border-radius:20px;background:white}.oidc-brand{display:flex;align-items:center;gap:16px;padding:18px 28px;background:#173e36;color:white}.oidc-brand img{width:48px;height:48px}.oidc-brand p{margin:0;font-size:21px;font-weight:700;line-height:1.08}section{padding:32px 36px 40px}section>h1{margin:0 0 10px;font-size:30px;line-height:1.15}section>p{line-height:1.45}form{margin-top:24px}label{display:block;margin:20px 0 8px}input,button{width:100%;padding:14px;border:1px solid #b9ccc0;border-radius:10px;font:inherit}button{margin-top:14px;background:#173e36;color:white;cursor:pointer;font-weight:600}.secondary{background:white;color:#173e36}.cancel{border-color:transparent;background:transparent}.notice{margin:0 0 4px;padding:12px 14px;border:1px solid #ef4b42;background:#fdecea;color:#8a1c16;border-radius:8px}.return{margin:0;font-size:14px;color:#3f5c52}.field-head,.password-field{display:flex;align-items:flex-end;gap:12px}.field-head{justify-content:space-between}.field-head label{margin-bottom:0}.field-link{font-size:14px;color:#3f5c52}.password-field input{flex:1}.password-field button{width:auto;margin-top:0}.account-picker{display:grid;grid-template-columns:44px minmax(0,1fr) 24px;align-items:center;gap:12px;padding:12px 14px;border:1px solid #b9ccc0;border-radius:12px;background:#f3f6f1}.account-avatar{display:grid;width:44px;height:44px;place-items:center;border-radius:50%;background:#173e36;color:white;font-size:18px;font-weight:700}.account-copy{display:flex;min-width:0;flex-direction:column;gap:2px}.account-copy small{font-size:12px;color:#3f5c52}.account-email{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.account-check{font-size:20px;font-weight:700}.permission-title{margin:22px 0 8px;font-weight:600}.permission-list{margin:0;padding:12px 14px 12px 36px;border:1px solid #b9ccc0;border-radius:12px}.permission-list li{padding:3px 0}.account-switch{text-align:left}.agreement-choice{display:flex;align-items:flex-start;gap:10px;margin:20px 0 8px}.agreement-choice input{width:auto}.fineprint{margin:6px 0;font-size:14px;color:#3f5c52}.agreement-link{display:inline-block;margin:2px 0 8px;color:#173e36;font-weight:600}@media(max-width:700px){body{padding:0}main{min-height:100vh;border:0;border-radius:0}.oidc-brand{padding:16px 24px}.oidc-brand img{width:44px;height:44px}.oidc-brand p{font-size:19px}section{padding:26px 24px 34px}section>h1{font-size:26px}}`;
const styles = `${baseStyles}button:disabled{border-color:#d4d9d5;background:#d4d9d5;color:#778079;cursor:not-allowed}.agreement-choice a{color:#173e36;font-weight:600}`;

const loginFields = (page: OidcInteractionPage) => {
  const model = credentialsModel({ email: page.email || "", password: "" });
  return `<label for="email">${escape(model.email.label)}</label><input id="email" type="email" name="email" value="${escape(model.email.value)}" autocomplete="username" required><div class="field-head"><label for="password">${escape(model.password.label)}</label>${page.forgotHref ? `<a class="field-link" href="${escape(page.forgotHref)}">${escape(model.forgot.label)}</a>` : ""}</div><div class="password-field"><input id="password" type="password" name="password" autocomplete="current-password" required><button type="button" aria-controls="password">${escape(model.reveal.label)}</button></div><button name="action" value="continue">Sign in</button><button class="secondary" name="action" value="signup">Create a Fidj account</button>${page.googleEnabled ? '<button class="secondary" name="action" value="google" formnovalidate>Continue with linked Google account</button>' : ""}<button class="secondary" name="action" value="cancel" formnovalidate>Cancel</button>`;
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
      ? `<label class="agreement-choice"><input type="checkbox" name="terms" value="true" required> <span>I accept the <a class="agreement-document" href="${escape(page.agreementHref)}" target="fidj-agreement" rel="noopener">service agreement · version ${escape(page.agreement.version)} ↗</a></span></label>`
      : `<label class="agreement-choice"><input type="checkbox" name="terms" value="true" required> ${escape(agreement.checkboxLabel)}</label>`;
  return `${identity}<p class="permission-title">${escape(page.appTitle)} will receive:</p><ul class="permission-list">${(page.scopes || []).map((scope) => `<li>${escape(scope)}</li>`).join("")}</ul>${agreementChoice}<button name="action" value="continue" disabled>Allow and continue</button><button class="secondary account-switch" name="action" value="switch" formnovalidate>Use another account</button><button class="cancel" name="action" value="cancel" formnovalidate>Cancel</button><script src="/oidc/assets/entry.js" defer></script>`;
};

export function oidcInteractionPage(page: OidcInteractionPage) {
  const waiting = page.mode === "waiting";
  const login = page.mode === "login";
  const heading = waiting
    ? "Check your email"
    : login
      ? `Sign in to your Fidj account to continue to ${escape(page.appTitle)}.`
      : `Continue to ${escape(page.appTitle)}`;
  const lead = waiting
    ? `Your account is created. Waiting for you to open the link sent to <strong>${escape(page.waitingEmail)}</strong>.`
    : login
      ? ""
      : "Share the requested identity information with this app. Optional privacy choices stay independent.";
  const fields = waiting
    ? waitFields(page)
    : login
      ? loginFields(page)
      : consentFields(page);
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${waiting ? "Check your email" : login ? "Sign in" : "Authorize"} · Fidj</title><style>${styles}</style><main><header class="oidc-brand"><img src="/oidc/assets/logo.png" alt="Fidj" width="58" height="58"><p>Your identity.<br>Your choices.</p></header><section><h1>${heading}</h1>${lead ? `<p>${lead}</p>` : ""}<p class="return">${escape(returnNoticeModel(page.appTitle))}</p>${waiting || !page.notice ? "" : `<p class="notice" role="alert">${escape(page.notice)}</p>`}<form method="post" action="${escape(page.action)}"><input type="hidden" name="csrf" value="${escape(page.csrf)}">${fields}</form><p><small>Fidj never shares your password with the app.</small></p></section></main>${login ? '<script src="/oidc/assets/entry.js" defer></script>' : ""}</html>`;
}
