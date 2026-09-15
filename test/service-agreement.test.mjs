import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import {
  agreementMarkup,
  acceptedAgreement,
  signInErrorMessage,
  bindAgreement,
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
  document.getElementById("signin").innerHTML =
    agreementMarkup() + '<button type="submit">Continue</button>';
  const element = document.getElementById("signin");
  const box = element.querySelector("#service-agreement");
  if (version !== undefined) {
    box.dataset.version = version;
    box.disabled = false;
  }
  box.checked = Boolean(checked);
  return element;
};

test("the agreement starts disabled, so nothing is accepted before it loads", () => {
  const element = form();
  const box = element.querySelector("#service-agreement");
  assert.equal(box.disabled, true);
  assert.equal(box.checked, false);
  assert.match(
    element.querySelector("#agreement-status").textContent,
    /Loading service agreement/,
  );
});

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

// What the submit button is actually gated on, which is not what
// generator-fidj's README says. `update()` copies the checkbox's *disabled*
// state onto the submit, so the door opens as soon as the agreement has
// loaded — ticked or not. Refusing an unticked submit is done afterwards, by
// the caller's submit handler, which answers with "Please accept the service
// agreement before continuing." The README claims "Both submit buttons stay
// disabled until it is checked"; the target flow asks for exactly that, on the
// agreement screen. Both are changes to make deliberately, not side effects of
// moving this file, so this states today's behaviour.
test("the submit waits for the agreement to load, not for the tick", async () => {
  const element = form();
  // jsdom implements no fetch, so the answer is shaped by hand: ok, and a json()
  // that resolves to what GET /apps/:appId returns.
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      app: { agreement: { version: "v9", text: "Terms." } },
    }),
  });
  await bindAgreement(element, "Mat Cloud App", "https://api.example", "app-1");
  const box = element.querySelector("#service-agreement");
  const submit = element.querySelector('button[type="submit"]');
  assert.equal(box.disabled, false, "the agreement loaded");
  assert.equal(box.dataset.version, "v9");
  assert.equal(submit.disabled, false, "open once the agreement is loaded");
  box.checked = true;
  box.dispatchEvent(new dom.window.Event("change"));
  assert.equal(submit.disabled, false, "and still open once ticked");
  assert.equal(
    element.querySelector("#agreement-label").textContent,
    "I accept the service agreement for Mat Cloud App.",
  );
});

test("an agreement that cannot be loaded keeps the door shut and offers a retry", async () => {
  const element = form();
  global.fetch = async () => {
    throw new Error("network down");
  };
  await bindAgreement(element, "Mat Cloud App", "https://api.example", "app-1");
  assert.equal(element.querySelector("#service-agreement").disabled, true);
  assert.equal(element.querySelector('button[type="submit"]').disabled, true);
  assert.equal(element.querySelector("#retry-agreement").hidden, false);
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
