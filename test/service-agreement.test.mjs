import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import {
  agreementScreen,
  acceptedAgreement,
  signInErrorMessage,
  providerEntry,
  signInHint,
  rememberSignIn,
  forgetSignIn,
} from "../dist/index.js";

// These are characterization tests: they state the behaviour the generated
// apps already depend on, so that moving the code out of generator-fidj cannot
// change it quietly. Anything asserted here was observed in the template before
// the move.

let dom;
beforeEach(() => {
  dom = new JSDOM("<!doctype html><body><form id='signin'></form></body>", {
    url: "https://app.example/",
  });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.HTMLElement = dom.window.HTMLElement;
});

const form = (checked, version) => {
  document.getElementById("signin").innerHTML = agreementScreen("Test App", {
    version: version ?? "",
    text: "Terms.",
  });
  const element = document.getElementById("signin");
  const box = element.querySelector("#service-agreement");
  if (version === undefined) delete box.dataset.version;
  box.checked = Boolean(checked);
  return element;
};

test("acceptance needs the tick and the version it was shown with", () => {
  assert.equal(acceptedAgreement(form(false, "v2")), null, "unticked");
  assert.equal(acceptedAgreement(form(true, undefined)), null, "no version");
  assert.deepEqual(acceptedAgreement(form(true, "v2")), {
    termsAccepted: true,
    termsVersion: "v2",
  });
});

test("a disabled box is never acceptance, whatever its checked state says", () => {
  const element = form(true, "v2");
  element.querySelector("#service-agreement").disabled = true;
  assert.equal(acceptedAgreement(element), null);
});

test("sign-in failures are named in words a person can act on", () => {
  assert.match(signInErrorMessage({ code: 429 }), /Too many attempts/);
  assert.match(
    signInErrorMessage({ reason: "unknown-user" }),
    /Check the email and password/,
  );
  assert.match(
    signInErrorMessage({ reason: "already exists - inconsistent request" }),
    /already uses this email/,
  );
  assert.match(
    signInErrorMessage({ reason: "ECONNREFUSED" }),
    /cannot reach Fidj/,
  );
  assert.match(signInErrorMessage({}), /Please try again/);
});

test("the button shape offers Fidj and no credential form", () => {
  const markup = providerEntry("Mat Cloud App", "app-1", "", false, "button");
  assert.match(markup, /Sign in with Fidj/);
  assert.doesNotMatch(markup, /id="password"/);
  assert.doesNotMatch(markup, /service-agreement/);
});

test("the inline shape is the app's own form, and it carries the agreement", () => {
  const markup = providerEntry(
    "Mat Cloud App",
    "app-1",
    '<input id="password">',
    false,
    "inline",
  );
  assert.match(markup, /id="password"/);
  assert.doesNotMatch(markup, /Sign in with Fidj/);
});

test("both shapes lead with Fidj and fold the form under a disclosure", () => {
  const markup = providerEntry(
    "Mat Cloud App",
    "app-1",
    '<input id="password">',
    false,
    "both",
  );
  assert.match(markup, /Sign in with Fidj/);
  assert.match(markup, /id="email-entry" hidden/);
  assert.match(markup, /id="use-email"/);
});

test("Fidj does not offer to sign in with Fidj", () => {
  const markup = providerEntry("Fidj", "fidj", "", true, "button");
  assert.match(markup, />Sign in</);
  assert.doesNotMatch(markup, /Sign in with Fidj/);
});

test("a remembered address is offered back, and signing out forgets it", () => {
  assert.equal(signInHint("app-1"), "");
  rememberSignIn("app-1", "someone@example.com");
  assert.equal(signInHint("app-1"), "someone@example.com");
  const markup = providerEntry("Mat Cloud App", "app-1", "", false, "button");
  assert.match(markup, /Continue as someone@example.com/);
  forgetSignIn("app-1");
  assert.equal(signInHint("app-1"), "");
});

test("a browser that refuses storage still renders an entry", () => {
  const blocked = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  global.localStorage = blocked;
  assert.equal(signInHint("app-1"), "");
  assert.doesNotThrow(() => rememberSignIn("app-1", "someone@example.com"));
  assert.doesNotThrow(() => forgetSignIn("app-1"));
});
