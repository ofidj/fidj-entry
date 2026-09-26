import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { agreementRequired, pollVerification } from "../dist/index.js";
import * as entryDom from "../dist/dom.js";
import {
  credentialFields,
  verificationWait,
  agreementScreen,
  bindAgreementScreen,
} from "../dist/dom.js";

// The entry flow the workspace README fixes: one screen asking for an email and
// a password with nothing gating it — which, after Create an account, grows a
// wait underneath it — and then the agreement on a screen of its own, whose
// submit stays read-only until it is ticked.

let dom;
beforeEach(() => {
  dom = new JSDOM("<!doctype html><body><form id='entry'></form></body>");
  global.window = dom.window;
  global.document = dom.window.document;
});

// ---------------------------------------------------------------- screen one

test("screen one asks for an email and a password, and gates neither button", () => {
  const markup = credentialFields({ email: "", password: "" });
  assert.match(markup, /id="email"/);
  assert.match(markup, /id="password"/);
  assert.match(markup, /name="signup" value="true"/);
  assert.doesNotMatch(
    markup,
    /service-agreement/,
    "the agreement is screen three's, not this one's",
  );
  assert.doesNotMatch(
    markup,
    /disabled/,
    "nothing on screen one starts disabled",
  );
});

test("the shared password reveal control survives a dynamically rendered form", () => {
  document.getElementById("entry").innerHTML = credentialFields({
    email: "",
    password: "secret",
  });
  entryDom.bindPasswordReveal(document.getElementById("entry"));
  const password = document.getElementById("password");
  const reveal = document.getElementById("reveal");

  reveal.click();
  assert.equal(password.type, "text");
  assert.equal(reveal.textContent, "Hide");

  reveal.click();
  assert.equal(password.type, "password");
  assert.equal(reveal.textContent, "Show");
});

test("opening the inline form hides the redundant different-account action", () => {
  document.body.innerHTML = `<button id="forget-hint">Use a different account</button><button id="fidj-entry" class="fidj-entry"></button><button id="use-email"></button><div id="email-entry" hidden><input id="email"></div>`;
  entryDom.showEmailEntry(true);
  assert.equal(document.getElementById("forget-hint").hidden, true);
  entryDom.showEmailEntry(false);
  assert.equal(document.getElementById("forget-hint").hidden, false);
});

// -------------------------------------------------------------- the trigger

test("a refusal that means the agreement is owed is recognised however it arrives", () => {
  assert.equal(agreementRequired({ code: 409 }), true);
  assert.equal(agreementRequired({ code: "agreement_required" }), true);
  assert.equal(agreementRequired({ reason: "agreement_required" }), true);
  assert.equal(
    agreementRequired({
      reason: JSON.stringify({ code: "agreement_required" }),
    }),
    true,
    "the API body survives as a JSON string through the SDK",
  );
  assert.equal(agreementRequired({ message: "agreement_required" }), true);
});

test("an ordinary refusal is not an agreement to collect", () => {
  for (const other of [
    { code: 401 },
    { code: 429 },
    { reason: "unknown-user" },
    {},
    null,
    undefined,
    "agreement",
  ])
    assert.equal(
      agreementRequired(other),
      false,
      `${JSON.stringify(other)} must not open the agreement screen`,
    );
});

// ------------------------------------------- the wait, under the same form

test("creating an account waits, and says where the link went", () => {
  const markup = verificationWait({ email: "someone@example.com" });
  assert.match(markup, /role="status"/, "the wait announces itself");
  assert.match(markup, /class="[^"]*spinner/, "the wait is visible");
  assert.match(markup, /someone@example\.com/);
  assert.match(markup, /id="resend-verification"/);
});

test("the wait goes under the form, so it is not a screen of its own", () => {
  const markup = verificationWait({ email: "someone@example.com" });
  // No heading: a heading makes this read as somewhere the person was taken,
  // and they were not — the form they just used is still above it.
  assert.doesNotMatch(markup, /<h1|<h2/);
  // And nothing offering "use a different address": the address field is right
  // there, which is the whole reason the form stays.
  assert.doesNotMatch(markup, /change-address/);
});

test("the wait never claims the person is signed in", () => {
  const markup = verificationWait({ email: "someone@example.com" });
  assert.doesNotMatch(markup, /signed in|Welcome back/i);
});

test("the form is still there underneath the wait", () => {
  document.getElementById("entry").innerHTML =
    credentialFields({ email: "someone@example.com", password: "" }) +
    verificationWait({ email: "someone@example.com" });
  const email = document.getElementById("email");
  assert.ok(email, "the address field survives the wait");
  assert.equal(email.value, "someone@example.com");
  assert.equal(email.disabled, false, "a mistyped address stays correctable");
  assert.ok(
    document.getElementById("resend-verification"),
    "and the wait is under it",
  );
});

test("an address on the waiting screen cannot smuggle markup", () => {
  assert.match(
    verificationWait({ email: "<b>x</b>" }),
    /&lt;b&gt;x&lt;\/b&gt;/,
  );
});

test("resending says so, and a failure says that instead", () => {
  assert.match(
    verificationWait({ email: "a@b.c", resent: true }),
    /sent again/i,
  );
  assert.match(
    verificationWait({ email: "a@b.c", error: "Too many attempts." }),
    /Too many attempts\./,
  );
});

test("the wait ends when the address is confirmed, and stops asking", async () => {
  let asked = 0;
  const verified = await new Promise((resolve) => {
    const stop = pollVerification({
      intervalMs: 5,
      check: async () => ++asked >= 3,
      onVerified: () => {
        stop();
        resolve(asked);
      },
    });
  });
  assert.equal(verified, 3, "it kept asking until the answer changed");
  const before = asked;
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(asked, before, "and stopped asking once it had it");
});

test("a check that throws is not an answer, and does not end the wait", async () => {
  let asked = 0;
  const stop = pollVerification({
    intervalMs: 5,
    check: async () => {
      asked += 1;
      throw new Error("offline");
    },
    onVerified: () => assert.fail("a failed check must not count as verified"),
  });
  await new Promise((r) => setTimeout(r, 30));
  stop();
  assert.ok(asked > 1, "it kept trying");
});

// -------------------------------------------------------------- screen three

test("screen three leads directly with the agreement checkbox", () => {
  const markup = agreementScreen(
    "Mat Cloud App",
    {
      version: "2026-09-11",
      text: "The full agreement.",
    },
    "https://api.example/v3/apps/app/agreements/2026-09-11",
  );
  assert.doesNotMatch(markup, /Before you continue/);
  assert.doesNotMatch(markup, /Mat Cloud App asks you to accept/);
  assert.doesNotMatch(markup, /The full agreement\./);
  assert.match(markup, /2026-09-11/);
  assert.match(
    markup,
    /href="https:\/\/api\.example\/v3\/apps\/app\/agreements\/2026-09-11"/,
  );
  assert.match(markup, /target="_blank" rel="noopener noreferrer"/);
  assert.match(markup, /id="service-agreement"[^>]*required/);
  assert.doesNotMatch(
    markup,
    /id="service-agreement"[^>]*checked/,
    "never pre-accepted",
  );
});

test("screen three's submit is read-only until the box is ticked", () => {
  document.getElementById("entry").innerHTML = agreementScreen(
    "Mat Cloud App",
    {
      version: "v9",
      text: "Terms.",
    },
    "https://api.example/agreement/v9",
  );
  const form = document.getElementById("entry");
  bindAgreementScreen(form);
  const box = form.querySelector("#service-agreement");
  const submit = form.querySelector('button[type="submit"]');
  assert.equal(submit.disabled, true, "read-only before the tick");
  box.checked = true;
  box.dispatchEvent(new dom.window.Event("change"));
  assert.equal(submit.disabled, false, "the tick is what opens it");
  box.checked = false;
  box.dispatchEvent(new dom.window.Event("change"));
  assert.equal(submit.disabled, true, "and untickng closes it again");
});

test("screen three carries the version it displayed, so acceptance is evidence", () => {
  document.getElementById("entry").innerHTML = agreementScreen(
    "App",
    {
      version: "2026-09-11",
      text: "Terms.",
    },
    "https://api.example/agreement/2026-09-11",
  );
  const box = document.querySelector("#service-agreement");
  assert.equal(box.dataset.version, "2026-09-11");
});

// ------------------------- the agreement the refusal itself carried

test("the agreement comes from the refusal, so it is the version the API compared", async () => {
  const { agreementFromRefusal } = await import("../dist/index.js");
  const agreement = { version: "2026-09-11", text: "The full agreement." };
  assert.deepEqual(
    agreementFromRefusal({
      code: 409,
      details: { code: "agreement_required", agreement },
    }),
    agreement,
  );
});

test("a refusal that carried nothing usable says so, rather than half an agreement", async () => {
  const { agreementFromRefusal } = await import("../dist/index.js");
  for (const thin of [
    { code: 409 },
    { code: 409, details: {} },
    { code: 409, details: { agreement: { version: "v1" } } },
    { code: 409, details: { agreement: { text: "words" } } },
    { code: 401, details: { agreement: { version: "v1", text: "t" } } },
    null,
  ])
    assert.equal(
      agreementFromRefusal(thin),
      null,
      `${JSON.stringify(thin)} is not an agreement to display`,
    );
});

// ------------------------------- what the SDK says when an account was created

test("an account that was just created is recognised, with the address it used", async () => {
  const { verificationPending } = await import("../dist/index.js");
  assert.deepEqual(
    verificationPending({
      code: 403,
      reason: "verification-required",
      details: { email: "someone@example.com" },
    }),
    { email: "someone@example.com" },
  );
});

test("an ordinary refusal is not an account waiting on its link", async () => {
  const { verificationPending } = await import("../dist/index.js");
  for (const other of [
    { code: 403, reason: "not connected" },
    { code: 409, reason: "agreement_required" },
    { code: 401 },
    null,
    "verification-required",
  ])
    assert.equal(
      verificationPending(other),
      null,
      `${JSON.stringify(other)} is not a created account`,
    );
});

test("a created account with no address still stops the sign-in", async () => {
  const { verificationPending } = await import("../dist/index.js");
  assert.deepEqual(
    verificationPending({ code: 403, reason: "verification-required" }),
    { email: "" },
  );
});
