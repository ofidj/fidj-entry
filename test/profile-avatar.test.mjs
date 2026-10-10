import { test } from "node:test";
import assert from "node:assert/strict";
import { profileAvatar } from "../dist/index.js";

// The profile opens on a round mark carrying the person's initials, the way a
// Google account does, on Fidj's console and in every generated app alike.

test("a full name gives the first letters of its first and last words", () => {
  assert.equal(profileAvatar("Ada Lovelace", "ada@example.com").initials, "AL");
  assert.equal(profileAvatar("jean de la fontaine", "").initials, "JF");
});

test("a single name gives its first two letters", () => {
  assert.equal(profileAvatar("Émile", "").initials, "ÉM");
});

test("without a name the address speaks for the person", () => {
  assert.equal(profileAvatar("", "john.doe@example.com").initials, "JD");
  assert.equal(profileAvatar(undefined, "admin@fidj.ovh").initials, "AD");
  assert.equal(profileAvatar("", "").initials, "?");
});

test("the colour looks random but stays with the person", () => {
  const one = profileAvatar("Ada Lovelace", "ada@example.com");
  assert.equal(profileAvatar("Ada", "ADA@example.com").hue, one.hue);
  assert.ok(Number.isInteger(one.hue) && one.hue >= 0 && one.hue < 360);
  const hues = new Set(
    ["a@x.io", "b@x.io", "c@x.io", "d@x.io", "e@x.io"].map(
      (email) => profileAvatar("", email).hue,
    ),
  );
  assert.ok(hues.size >= 4);
});
