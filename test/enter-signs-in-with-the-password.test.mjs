import { test } from "node:test";
import assert from "node:assert/strict";
import { credentialFields } from "../dist/dom.js";
import * as serverEntry from "../dist/server.js";

// Enter in a text field submits the form with its first submit button. With
// the passkey door drawn first, typing a password and pressing Enter started
// the passkey ceremony instead of signing in, and the screen sat on "Please
// wait…" (UI review, 3 Oct, on Fidj's own entry). The first submit button has
// to be the credential one, on both renderers.
const firstSubmit = (html) => {
  for (const tag of html.match(/<button\b[^>]*>/g) || []) {
    const type = (tag.match(/\btype="([^"]*)"/) || [])[1] || "submit";
    if (type === "submit") return tag;
  }
  return "";
};

test("Enter signs in with the password on the DOM entry, passkey drawn first", () => {
  const html = credentialFields({ email: "", password: "" }, { passkey: true });
  const first = firstSubmit(html);
  assert.match(first, /value="credentials"/);
  // Still the passkey that a person sees first.
  assert.ok(
    html.indexOf("Continue with a passkey") < html.indexOf('id="email"'),
  );
});

test("Enter signs in with the password on the Fidj window, passkey drawn first", () => {
  const html = serverEntry.oidcInteractionPage({
    mode: "login",
    appTitle: "Studio Notes",
    action: "/oidc/interaction/abc",
    csrf: "csrf-token",
    passkey: { ticket: "ticket-1", options: { challenge: "c" } },
  });
  const first = firstSubmit(html.slice(html.indexOf("<form")));
  assert.match(first, /value="continue"/);
});
