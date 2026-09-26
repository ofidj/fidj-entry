import { test } from "node:test";
import assert from "node:assert/strict";
import * as serverEntry from "../dist/server.js";

test("the server renderer owns the complete OIDC credential screen", () => {
  const html = serverEntry.oidcInteractionPage({
    mode: "login",
    appTitle: "Studio <Notes>",
    action: "/oidc/interaction/abc",
    csrf: "csrf-token",
    email: "mat@example.com",
    forgotHref: "https://fidj.example/#/forgot",
    notice: "Try again.",
    googleEnabled: true,
  });

  assert.match(
    html,
    /<header class="oidc-brand">[\s\S]*Your identity\.<br>Your choices\./,
  );
  assert.match(
    html,
    /<h1>Sign in to your Fidj account to continue to Studio &lt;Notes&gt;\.<\/h1>/,
  );
  assert.doesNotMatch(html, /Welcome back/);
  assert.doesNotMatch(html, /One account\. Clear control/);
  assert.match(html, /Studio &lt;Notes&gt;/);
  assert.match(html, /id="password"/);
  assert.match(html, /aria-controls="password">Show/);
  assert.match(html, /src="\/oidc\/assets\/entry\.js"/);
  assert.doesNotMatch(html, /<Notes>/);
});

test("the server renderer owns the OIDC wait and consent screens", () => {
  const waiting = serverEntry.oidcInteractionPage({
    mode: "waiting",
    appTitle: "Studio Notes",
    action: "/oidc/interaction/abc",
    csrf: "csrf-token",
    waitingEmail: "mat@example.com",
    resent: true,
  });
  assert.match(waiting, /Check your email/);
  assert.match(waiting, /sent again/);

  const consent = serverEntry.oidcInteractionPage({
    mode: "consent",
    appTitle: "Studio Notes",
    action: "/oidc/interaction/abc",
    csrf: "csrf-token",
    scopes: ["Your display name"],
    agreement: { version: "v1", text: "Terms" },
    agreementHref: "/v3/apps/studio/agreements/v1",
    recognisedEmail: "admin+owner@example.com",
  });
  // The app and what it receives speak for themselves: no lead paraphrasing
  // them, and no password promise on a screen that asks for no password.
  assert.doesNotMatch(consent, /Share the requested identity information/);
  assert.doesNotMatch(consent, /never shares your password/);
  assert.match(consent, /class="account-picker"/);
  assert.match(consent, /class="account-avatar"[^>]*>A<\/span>/);
  assert.match(
    consent,
    /class="account-email">admin\+owner@example\.com<\/strong>/,
  );
  assert.match(consent, /class="permission-list"/);
  assert.match(consent, /class="secondary account-switch"/);
  assert.match(consent, /Your display name/);
  assert.match(consent, /href="\/v3\/apps\/studio\/agreements\/v1"/);
  assert.match(consent, /class="agreement-document"[^>]*target="_blank"/);
  assert.match(consent, /rel="noopener noreferrer"/);
  assert.doesNotMatch(consent, /fidj-agreement/);
  assert.match(consent, /class="agreement-document"/);
  assert.doesNotMatch(consent, /class="agreement-text"/);
  assert.doesNotMatch(consent, />Terms</);
  assert.doesNotMatch(consent, /<details class="agreement">/);
  assert.match(consent, /I accept the <a[^>]+>service agreement/);
});

test("the shared server script binds password reveal", () => {
  assert.match(serverEntry.oidcInteractionScript, /bindPasswordReveal/);
  // The agreement is a document, read in the browser like any other: never
  // a window opened from inside the one the app already opened.
  assert.doesNotMatch(serverEntry.oidcInteractionScript, /window\.open/);
});

// v3: on the Fidj window the passkey is the first door too. The page allows
// no request of its own, so it carries the options and the ticket, and posts
// the authenticator's answer as a form.
test("the server renderer puts the passkey first and carries its challenge", () => {
  const html = serverEntry.oidcInteractionPage({
    mode: "login",
    appTitle: "Studio Notes",
    action: "/oidc/interaction/abc",
    csrf: "csrf-token",
    passkey: { ticket: "ticket-1", options: { challenge: "c<1>" } },
  });
  assert.match(
    html,
    /name="action" value="passkey"[^>]*>Continue with a passkey/,
  );
  assert.ok(html.indexOf('value="passkey"') < html.indexOf('id="email"'));
  assert.match(html, /name="passkeyTicket" value="ticket-1"/);
  assert.match(html, /name="passkey" value=""/);
  assert.match(html, /data-passkey-options="[^"]*c&lt;1&gt;/);
  assert.match(html, /or with your email/);
  assert.match(
    serverEntry.oidcInteractionScript,
    /navigator\.credentials\.get/,
  );
});

// The page's only script is a string inside a template literal, where a lone
// backslash disappears. A script that does not parse takes every binding down
// with it — the agreement's checkbox among them.
test("the interaction script is valid JavaScript", () => {
  assert.doesNotThrow(() => new Function(serverEntry.oidcInteractionScript));
});

// The provider's own page and Fidj's front end draw the same screen: one
// markup, one scoped stylesheet, so the window an app opens looks the same
// whichever of the two answers it.
test("the interaction markup is shared, script-free and scoped", () => {
  const page = {
    mode: "consent",
    appTitle: "Studio Notes",
    action: "https://api.example/oidc/interaction/abc",
    csrf: "csrf-token",
    scopes: ["Your display name"],
    agreement: { version: "v1", text: "Terms" },
    agreementHref: "https://api.example/v3/apps/studio/agreements/v1",
    logoSrc: "./fidj-logo.png",
  };
  const markup = serverEntry.oidcInteractionMarkup(page);
  assert.match(markup, /^<div class="oidc-page">/);
  // A front end draws it inside its own <main>; the provider's page adds one.
  assert.doesNotMatch(markup, /<main/);
  assert.match(
    serverEntry.oidcInteractionPage(page),
    /<main><div class="oidc-page">/,
  );
  assert.match(markup, /src="\.\/fidj-logo\.png"/);
  assert.match(markup, /<form id="interaction" method="post"/);
  assert.doesNotMatch(markup, /<script/);
  assert.doesNotMatch(markup, /<html|<style/);
  assert.ok(serverEntry.oidcInteractionPage(page).includes(markup));
  for (const rule of serverEntry.oidcInteractionStyles.split("}")) {
    const selector = rule.split("{")[0].trim();
    if (!selector || selector.startsWith("@media") || /^[0-9]/.test(selector))
      continue;
    for (const part of selector.replace(/\([^)]*\)/g, "()").split(","))
      assert.match(part.trim(), /^\.oidc-page\b/, `unscoped: ${part}`);
  }
});
