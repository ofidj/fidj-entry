import { test } from "node:test";
import assert from "node:assert/strict";
import {
  escape,
  masthead,
  highlightCells,
  badgeStrip,
  credentialFields,
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
