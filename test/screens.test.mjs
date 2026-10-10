import { test } from "node:test";
import assert from "node:assert/strict";
import {
  escape,
  masthead,
  highlightCells,
  badgeStrip,
  credentialFields,
  walletDoor,
  accountForm,
  returnNotice,
} from "../dist/dom.js";

// The markup the entry draws, lifted out of generator-fidj's content.ts. These
// assert what the screens say and what they gate on; the shells that hold them
// stay with their callers, because the three of them differ in where
// signin-trust sits and unifying that is a change, not a move.

test("escaping closes every hole a title or an address could open", () => {
  assert.equal(
    escape(`<img src=x onerror="alert('1')">`),
    "&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;",
  );
  assert.equal(escape(null), "");
  assert.equal(escape(undefined), "");
  assert.equal(escape(0), "0");
});

test("the masthead carries the app's own mark and name", () => {
  const markup = masthead("/brand/logo.png", "Mat Cloud App");
  assert.match(markup, /class="signin-masthead"/);
  assert.match(markup, /src="\/brand\/logo\.png"/);
  assert.match(markup, /<strong>Mat Cloud App<\/strong>/);
  assert.match(markup, /alt=""/, "the mark is decorative beside the name");
});

test("highlights are numbered from one, and absent when there are none", () => {
  assert.equal(highlightCells([]), "");
  assert.equal(highlightCells(undefined), "");
  const markup = highlightCells([
    { heading: "One", body: "First" },
    { heading: "Two", body: "Second" },
  ]);
  assert.match(markup, /<p class="eyebrow">01<\/p><h2>One<\/h2>/);
  assert.match(markup, /<p class="eyebrow">02<\/p><h2>Two<\/h2>/);
});

test("badges are a footer, or nothing at all", () => {
  assert.equal(badgeStrip([]), "");
  assert.equal(badgeStrip(undefined), "");
  assert.match(
    badgeStrip(["Beta", "EU"]),
    /<span>Beta<\/span><span>EU<\/span>/,
  );
});

test("the credential fields carry both doors and what was already typed", () => {
  const markup = credentialFields({ email: "a@b.c", password: "" });
  assert.match(markup, /value="a@b\.c"/);
  assert.match(markup, /autocomplete="username"/);
  assert.match(markup, /autocomplete="current-password"/);
  assert.match(markup, /name="signup" value="true">Create an account/);
  assert.match(markup, /href="#\/forgot"/, "a way out of a forgotten password");
  assert.match(markup, /id="reveal"/);
});

test("forgot asks for an address and promises nothing about it", () => {
  const markup = accountForm("forgot", {});
  assert.match(markup, /<h2>Reset your password<\/h2>/);
  assert.match(markup, /id="recovery-email"/);
});

test("reset needs its link, and says so when it has none", () => {
  assert.match(
    accountForm("reset", { linkToken: "t" }),
    /id="new-password"[\s\S]*id="confirm-password"/,
  );
  const without = accountForm("reset", { linkToken: "" });
  assert.doesNotMatch(without, /id="new-password"/);
  assert.match(without, /Request a reset link/);
});

test("verify is a click, never something a page load consumes", () => {
  const waiting = accountForm("verify", {
    linkToken: "t",
    verificationConfirmed: false,
  });
  assert.match(waiting, /<h2>Verify your email<\/h2>/);
  assert.match(waiting, /Confirm email address/);
  const done = accountForm("verify", {
    linkToken: "",
    verificationConfirmed: true,
  });
  assert.match(done, /<h2>Email verified<\/h2>/);
  assert.doesNotMatch(done, /<form/);
});

test("my account names who is signed in and whether they are verified", () => {
  const unverified = accountForm("account", {
    accountEmail: "someone@example.com",
    emailVerified: false,
  });
  assert.match(
    unverified,
    /Signed in as <strong>someone@example\.com<\/strong>/,
  );
  assert.match(unverified, /not verified yet/);
  assert.match(unverified, /id="resend-verification"/);
  const verified = accountForm("account", {
    accountEmail: "someone@example.com",
    emailVerified: true,
  });
  assert.match(verified, /is verified/);
  assert.doesNotMatch(verified, /id="resend-verification"/);
});

test("an address on the account screen cannot smuggle markup", () => {
  assert.match(
    accountForm("account", { accountEmail: "<b>x</b>" }),
    /&lt;b&gt;x&lt;\/b&gt;/,
  );
});

test("a window that opened itself says where it will put you back", () => {
  assert.match(
    returnNotice("Mat Cloud App"),
    /takes you back to Mat Cloud App/,
  );
  assert.match(returnNotice("<b>"), /&lt;b&gt;/);
});

// v3: the passkey is the first door, the email under it, and the wallet is
// drawn as a promise with its date, never as a working button.
test("the passkey is the first door, then the email", () => {
  const markup = credentialFields(
    { email: "", password: "" },
    { passkey: true },
  );
  assert.match(markup, /id="entry-passkey"[^>]*>Continue with a passkey/);
  assert.ok(
    markup.indexOf('id="entry-passkey"') < markup.indexOf('id="email"'),
    "the passkey comes before the email",
  );
  assert.match(markup, /or with your email/);
  assert.doesNotMatch(
    credentialFields({ email: "", password: "" }),
    /entry-passkey/,
    "no passkey door where the passkey cannot run",
  );
});

test("the wallet door is drawn disabled, with its date", () => {
  const markup = walletDoor();
  assert.match(markup, /EU Digital Identity Wallet/);
  assert.match(markup, /From Dec 2026/i);
  assert.match(markup, /aria-disabled="true"/);
  assert.doesNotMatch(markup, /<button/);
});

// The member card every generated app draws on its account screen — the shell
// and the Studio Notes starter alike — so there is one reading of "your
// membership", the same as Fidj's GDPR card.
test("the member card: agreement, switches, history, export and the way out", async () => {
  const { memberCard } = await import("../dist/dom.js");
  const accepted = memberCard({
    consent: { terms: true, termsVersion: "v2", analytics: true },
    history: [
      { type: "analytics", granted: true, changedAt: "2026-09-24T12:00:00Z" },
    ],
    agreementHref: "https://api.example/v3/apps/a/agreements/v2",
    manageHref: "https://fidj.example/#/my/gdpr",
  });
  assert.match(
    accepted,
    /class="basis"[^>]*href="https:\/\/api\.example\/v3\/apps\/a\/agreements\/v2"/,
  );
  // The same words as Fidj's own GDPR card: the link reads the contract, the
  // version is on the card's figures.
  assert.match(accepted, /Contract · read it ↗/);
  assert.doesNotMatch(accepted, /Contract · agreement/);
  assert.match(
    accepted,
    /role="switch"[^>]*data-purpose="analytics"[^>]*checked/,
  );
  assert.match(accepted, /aria-labelledby="purpose-analytics-label"/);
  assert.match(accepted, /aria-describedby="purpose-analytics-description"/);
  assert.doesNotMatch(accepted, />Consent<\/span>/);
  assert.match(accepted, /class="switch-state"[^>]*>On</);
  // History is a toggle like the console's, not a native disclosure triangle,
  // and it reads with the switch's own title.
  assert.doesNotMatch(accepted, /<details/);
  assert.match(
    accepted,
    /<button type="button" id="history-toggle" aria-expanded="false" aria-controls="member-history">History<\/button>/,
  );
  assert.match(accepted, /id="member-history" class="member-history" hidden/);
  assert.match(accepted, /24 Sep 2026, \d\d:\d\d/);
  assert.match(accepted, /Analytics · turned on/);
  assert.doesNotMatch(accepted, /analytics given/);
  assert.match(accepted, /id="export">Export</);
  assert.match(accepted, /id="leave" class="danger">Leave &amp; erase</);
  assert.match(accepted, /href="https:\/\/fidj\.example\/#\/my\/gdpr"/);

  const owed = memberCard({ consent: {}, history: [] });
  assert.match(owed, /id="accept-terms"/);
  const owner = memberCard({
    consent: { terms: true },
    history: [],
    owner: true,
  });
  assert.doesNotMatch(owner, /id="leave"/);
  const leaving = memberCard({
    consent: { terms: true },
    history: [],
    leaving: true,
  });
  assert.match(leaving, /id="confirm-leave"/);
  // Leaving erases: the confirmation is announced as one.
  assert.match(leaving, /role="alertdialog"[^>]*aria-labelledby="leave-title"/);
  assert.match(leaving, /id="cancel-leave"/);
});

// The History button opens and closes the list it controls, and says which.
test("the member card's History button toggles the list", async () => {
  const { JSDOM } = await import("jsdom");
  const { memberCard, bindMemberHistory } = await import("../dist/dom.js");
  const dom = new JSDOM(
    `<div id="root">${memberCard({ consent: { terms: true }, history: [] })}</div>`,
  );
  const root = dom.window.document.getElementById("root");
  bindMemberHistory(root);
  const toggle = root.querySelector("#history-toggle");
  const list = root.querySelector("#member-history");
  assert.equal(list.hidden, true);
  toggle.click();
  assert.equal(list.hidden, false);
  assert.equal(toggle.getAttribute("aria-expanded"), "true");
  toggle.click();
  assert.equal(list.hidden, true);
  assert.equal(toggle.getAttribute("aria-expanded"), "false");
});

// A row of dots is not a hint: it only restates that the field is masked.
test("the password field carries no placeholder of dots", () => {
  const markup = credentialFields({ email: "", password: "" });
  const field = markup.match(/<input id="password"[^>]*>/)[0];
  assert.doesNotMatch(field, /•/);
  assert.doesNotMatch(field, /placeholder=""/);
});

// A title that only repeats the lit tab stays for a screen reader, out of
// sight, on Fidj and in every generated app.
test("the shared style hides a title that echoes the lit tab", async () => {
  const { readFileSync } = await import("node:fs");
  const css = readFileSync(
    new URL("../src/style.css", import.meta.url),
    "utf8",
  );
  const rule = css.match(/\n\.echoes-tab \{([^}]*)\}/);
  assert.ok(rule);
  assert.match(rule[1], /position: absolute/);
  assert.match(rule[1], /clip: rect\(0 0 0 0\)/);
});
