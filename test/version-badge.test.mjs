import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { showVersionBadge } from "../dist/index.js";

// Moved from generator-fidj's version.test.cjs, which read the guard back out
// of the source with a regex because the function was not importable from
// there. It is now, so this asks the function instead of reading it.

let dom;
beforeEach(() => {
  dom = new JSDOM("<!doctype html><body></body>");
  global.window = dom.window;
  global.document = dom.window.document;
});

const badge = () => document.querySelector(".fidj-version");

test("the badge names Fidj and the version it is running", () => {
  showVersionBadge("3.7.3");
  assert.equal(badge()?.textContent, "fidj@3.7.3");
  assert.equal(badge()?.getAttribute("aria-label"), "Fidj version 3.7.3");
});

test("a prerelease is a version too", () => {
  showVersionBadge("3.7.3-rc.1");
  assert.equal(badge()?.textContent, "fidj@3.7.3-rc.1");
});

test("an app served without a readable version shows no badge at all", () => {
  for (const unreadable of ["", "v3.7.3", "unknown", "3.7"]) {
    dom = new JSDOM("<!doctype html><body></body>");
    global.document = dom.window.document;
    showVersionBadge(unreadable);
    assert.equal(badge(), null, `"${unreadable}" is not a version`);
  }
});
