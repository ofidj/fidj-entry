import { test } from "node:test";
import assert from "node:assert/strict";
import { permissionMeanings, permissionLines } from "../dist/index.js";
import { permissionLines as serverLines } from "../dist/server.js";

// The consent screen is drawn twice — by the API's own page and by Fidj's front
// end — and both list what the app will receive in the same words. The words
// live here once, so a new permission cannot be explained on one screen and
// missing from the other.
test("every permission a Fidj client can ask for has one meaning", () => {
  for (const scope of [
    "openid",
    "profile",
    "email",
    "offline_access",
    "fidj:api",
    "fidj:account.delete",
  ])
    assert.ok(permissionMeanings[scope], scope);
});

// Deleting the shared account is the one permission that ends everything. It
// is named for what it does, on the person's request, never folded into "use
// Fidj services".
test("account deletion is stated plainly and only when asked", () => {
  assert.match(
    permissionMeanings["fidj:account.delete"],
    /^Delete your Fidj account/,
  );
  assert.deepEqual(permissionLines("openid fidj:api"), [
    "An identity specific to this app",
    "Use Fidj account and privacy services for this app",
  ]);
  assert.ok(
    permissionLines("openid fidj:api fidj:account.delete").some((line) =>
      line.startsWith("Delete your Fidj account"),
    ),
  );
  assert.deepEqual(permissionLines("openid unknown:scope"), [
    "An identity specific to this app",
  ]);
  assert.equal(serverLines, permissionLines);
});
