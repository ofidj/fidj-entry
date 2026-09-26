import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  accountModel,
  acceptance,
  agreementModel,
  credentialsModel,
  providerEntryModel,
  returnNoticeModel,
  verificationWaitModel,
} from "../dist/index.js";
import {
  accountForm,
  agreementScreen,
  credentialFields,
  providerEntry,
  returnNotice,
  verificationWait,
} from "../dist/dom.js";

// This file never loads jsdom and never defines `window` or `document`. That is
// the assertion, not the setup: the root of the package has to be usable from a
// React or Vue app, from a server render, and from a plain Node script, and the
// only way to keep that true is to have something exercise it with no browser
// anywhere in the room.

test("every screen is a value, reachable with no browser at all", () => {
  assert.equal(typeof globalThis.document, "undefined");
  assert.equal(typeof globalThis.window, "undefined");

  assert.equal(
    agreementModel("Mat Cloud", { version: "v1", text: "T" }).heading,
    "Before you continue",
  );
  assert.equal(verificationWaitModel({ email: "a@b.c" }).email, "a@b.c");
  assert.equal(
    providerEntryModel({ title: "Mat Cloud" }).door.label,
    "Sign in with Fidj",
  );
  assert.equal(accountModel("forgot", {}).submitLabel, "Send reset link");
  assert.equal(
    credentialsModel({ email: "", password: "" }).submit.label,
    "Continue",
  );
  assert.match(returnNoticeModel("Mat Cloud"), /takes you back to Mat Cloud/);
});

// A build-time check, because an import that only *sometimes* touches the DOM
// would pass every test above and still break the first server render — the
// branch nobody exercised is exactly the one that reaches for `document`.
//
// It looks at code, not at prose: this package's own copy says "Fidj asks in a
// window of its own", and a check that cannot tell a sentence from a call would
// fail on the wording it exists to protect. So comments and string literals go
// first, and what is left is what actually runs.
// Strings go before line comments on purpose: a `//` inside a string literal
// is not a comment, and stripping comments first would eat the rest of the line
// it lives on.
const codeOnly = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/`(?:\\.|\$\{[^}]*\}|[^`\\])*`/g, '""')
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, '""')
    .replace(/\/\/.*$/gm, " ");

test("the model carries no browser API, in the built output", async () => {
  const built = codeOnly(
    await readFile(new URL("../dist/model.js", import.meta.url), "utf8"),
  );
  for (const forbidden of [
    "document",
    "window",
    "localStorage",
    "navigator",
    "fetch",
  ]) {
    assert.doesNotMatch(
      built,
      new RegExp(`\\b${forbidden}\\b`),
      `dist/model.js uses ${forbidden}, so it is not renderable without a browser`,
    );
  }
  // And the stripper has to actually strip, or this test passes by blindness.
  assert.match(
    codeOnly('const a = "window.document"; // window\n'),
    /^const a = "";\s*$/,
  );
});

test("the HTML renderer keeps only the acceptance action from the model", () => {
  const agreement = {
    version: "starter-demo-1",
    text: "Demo service agreement.",
  };
  const model = agreementModel("Mat Cloud", agreement);
  const html = agreementScreen(
    "Mat Cloud",
    agreement,
    "https://api.example/agreement",
  );
  for (const sentence of [model.versionLabel, model.submitLabel])
    assert.ok(
      html.includes(sentence),
      `the agreement screen dropped: ${sentence}`,
    );
  for (const omitted of [model.heading, model.lead, model.text])
    assert.ok(
      !html.includes(omitted),
      `the agreement screen still includes: ${omitted}`,
    );

  const wait = verificationWaitModel({ email: "a@b.c", resent: true });
  const waitHtml = verificationWait({ email: "a@b.c", resent: true });
  for (const sentence of [
    wait.status,
    wait.fineprint,
    wait.notice.text,
    wait.resendLabel,
  ])
    assert.ok(waitHtml.includes(sentence), `the wait dropped: ${sentence}`);

  const entry = providerEntryModel({ title: "Mat Cloud" });
  const entryHtml = providerEntry("Mat Cloud", "app-with-no-storage", "");
  assert.ok(entryHtml.includes(entry.lead));
  assert.ok(entryHtml.includes(entry.door.label));

  // Every shape, not just the default: `both` is where the branching is, so it
  // is the one a renderer can quietly drop a door from.
  for (const shape of ["button", "inline", "both"]) {
    const model = providerEntryModel({
      title: "Mat Cloud",
      shape,
      hasCredentials: true,
    });
    const html = providerEntry(
      "Mat Cloud",
      "app-with-no-storage",
      "<input id=email>",
      false,
      shape,
    );
    assert.ok(html.includes(model.lead), `${shape} dropped its lead`);
    if (model.door)
      assert.ok(html.includes(model.door.label), `${shape} dropped its door`);
    else
      assert.equal(html.includes("fidj-entry"), false, `${shape} grew a door`);
    assert.equal(
      html.includes('aria-controls="email-entry"'),
      Boolean(model.disclosure),
      `${shape} disagrees with its model about the disclosure`,
    );
    // A `button` app renders no password field at all, even when one was
    // handed to it: Fidj is the only door, and a field that is merely hidden
    // is still a field a page could be talked into filling.
    assert.equal(
      html.includes("<input id=email>"),
      shape !== "button",
      `${shape} disagrees about whether the app collects a password`,
    );
  }

  const account = accountModel("reset", { linkToken: "t" });
  const accountHtml = accountForm("reset", { linkToken: "t" });
  for (const sentence of [
    account.heading,
    account.intro,
    account.hint,
    account.submitLabel,
  ])
    assert.ok(
      accountHtml.includes(sentence),
      `the reset screen dropped: ${sentence}`,
    );

  const credentials = credentialsModel({ email: "a@b.c", password: "" });
  const credentialsHtml = credentialFields({ email: "a@b.c", password: "" });
  for (const label of [
    credentials.email.label,
    credentials.password.label,
    credentials.forgot.label,
    credentials.submit.label,
    credentials.signup.label,
  ])
    assert.ok(
      credentialsHtml.includes(label),
      `the credential fields dropped: ${label}`,
    );

  assert.ok(returnNotice("Mat Cloud").includes(returnNoticeModel("Mat Cloud")));
});

// The acceptance rule, asked without a form. `@ofidj/entry/dom` reads these
// three facts off a checkbox; a React app reads them off its own state, and
// both have to get the same answer or the evidence means different things.
test("acceptance asks the same question of a form and of a state object", () => {
  assert.deepEqual(acceptance({ checked: true, version: "v1" }), {
    termsAccepted: true,
    termsVersion: "v1",
  });
  assert.equal(acceptance({ checked: false, version: "v1" }), null);
  assert.equal(
    acceptance({ checked: true, disabled: true, version: "v1" }),
    null,
  );
  assert.equal(
    acceptance({ checked: true }),
    null,
    "a tick with no version is not evidence",
  );
});

// The shape logic is where the branching lives, so it is where a second
// implementation would go wrong. A model that decides it once is the fix.
test("the entry's shape decides which doors exist, without rendering one", () => {
  const inline = providerEntryModel({ title: "Mat Cloud", shape: "inline" });
  assert.equal(inline.door, null, "an inline app offers no Fidj door");
  assert.equal(inline.disclosure, null);

  const button = providerEntryModel({
    title: "Mat Cloud",
    shape: "button",
    hasCredentials: true,
  });
  assert.equal(
    button.disclosure,
    null,
    "nothing to fold when there is one door",
  );

  const both = providerEntryModel({
    title: "Mat Cloud",
    shape: "both",
    hasCredentials: true,
  });
  assert.equal(both.disclosure.controls, "email-entry");
  assert.equal(both.disclosure.expanded, false);

  // `both` without a form is a button: the shape asks for a second door the app
  // never supplied, and offering a disclosure over nothing is worse than not.
  assert.equal(
    providerEntryModel({ title: "Mat Cloud", shape: "both" }).disclosure,
    null,
  );

  const remembered = providerEntryModel({
    title: "Mat Cloud",
    hint: "mathieu@fidj.local",
  });
  assert.equal(remembered.door.label, "Continue as mathieu@fidj.local");
  assert.equal(remembered.forget.label, "Use a different account");
  assert.equal(providerEntryModel({ title: "Mat Cloud" }).forget, null);

  assert.equal(
    providerEntryModel({ title: "Fidj", isFidjItself: true }).door.label,
    "Sign in",
  );
});

// One way to write a date, on Fidj and in every generated app: the console
// mixed "Sep 26, 2026, 1:41:50 PM", "24/09/2026", "9/25/26" and raw ISO
// strings. Month names are spelled out so no reader has to guess the order.
test("dates read the same everywhere", async () => {
  const { formatDate } = await import("../dist/index.js");
  const at = new Date(2026, 8, 24, 13, 5);
  assert.equal(formatDate(at), "24 Sep 2026");
  assert.equal(formatDate(at, "datetime"), "24 Sep 2026, 13:05");
  assert.equal(formatDate(at.toISOString()), "24 Sep 2026");
  assert.equal(formatDate(undefined), "");
  assert.equal(formatDate("not a date"), "");
});

// The optional choices every app offers today, named once. The console said
// "Optional data" on GDPR and "Optional profile data" on the public page, and
// generated apps had their own sentences.
test("the optional choices are named once", async () => {
  const { optionalPurposes } = await import("../dist/index.js");
  assert.deepEqual(
    optionalPurposes.map((purpose) => purpose.key),
    ["analytics", "communications", "optionalData"],
  );
  for (const purpose of optionalPurposes) {
    assert.ok(purpose.title && purpose.description, purpose.key);
  }
});

// The app's own form, folded under the Fidj door, is offered in the mockup's
// words: "Inline form" named how it is built, not what it is for.
test("the folded form is offered as signing in with an email", async () => {
  const { providerEntryModel } = await import("../dist/index.js");
  const model = providerEntryModel({
    title: "Mat Cloud App",
    hint: "",
    isFidjItself: false,
    shape: "both",
    hasCredentials: true,
  });
  assert.equal(model.disclosure.label, "Or with your email");
});
