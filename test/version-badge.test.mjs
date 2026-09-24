import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { showVersionBadge } from "../dist/dom.js";

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

// Fidj's own site carries a console module with its own patch; the badge says
// which one is running, between the SDK and the API.
test("the badge names the module it carries, then the API", async () => {
  global.fetch = async () => ({ ok: true, json: async () => ({ version: "3.15.0" }) });
  showVersionBadge("3.15.0", "https://api.example/v3", { name: "console", version: "3.15.3" });
  assert.equal(badge()?.textContent, "fidj@3.15.0 · console 3.15.3");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(badge()?.textContent, "fidj@3.15.0 · console 3.15.3 · API 3.15.0");
});

test("a module without a readable version is left out", () => {
  showVersionBadge("3.15.0", undefined, { name: "console", version: "unknown" });
  assert.equal(badge()?.textContent, "fidj@3.15.0");
});
