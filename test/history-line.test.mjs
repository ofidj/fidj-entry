import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate, historyLine } from "../dist/index.js";

// One reading of a consent history, on Fidj's console and in every generated
// app. The console wrote "communications granted — from profile" with a date,
// the apps wrote "communications given" with a time: the same record, two
// sentences, neither using the name the person saw on the switch.

const at = "2026-09-24T12:05:00Z";

test("a choice reads with the title the switch carries", () => {
  assert.deepEqual(
    historyLine({ type: "communications", granted: true, changedAt: at }),
    { when: formatDate(at, "datetime"), what: "Communications · turned on" },
  );
  assert.equal(
    historyLine({ type: "analytics", granted: false, changedAt: at }).what,
    "Analytics · turned off",
  );
  assert.equal(
    historyLine({ type: "optionalData", granted: true, changedAt: at }).what,
    "Optional data · turned on",
  );
});

test("the agreement reads as accepted, with its version, or withdrawn", () => {
  assert.equal(
    historyLine({
      type: "terms",
      granted: true,
      changedAt: at,
      cguVersion: "v2",
    }).what,
    "Service agreement accepted · version v2",
  );
  assert.equal(
    historyLine({ type: "terms", granted: true, changedAt: at }).what,
    "Service agreement accepted",
  );
  assert.equal(
    historyLine({
      type: "terms",
      granted: false,
      changedAt: at,
      cguVersion: "v2",
    }).what,
    "Service agreement withdrawn",
  );
});

test("the source is an internal id and is never shown", () => {
  const line = historyLine({
    type: "communications",
    granted: true,
    changedAt: at,
    source: "profile",
  });
  assert.doesNotMatch(line.what, /profile|from/);
});

test("an unknown type is capitalised rather than dropped", () => {
  assert.equal(
    historyLine({ type: "newsletter", granted: true, changedAt: at }).what,
    "Newsletter · turned on",
  );
});

test("the time is part of the line, and a missing date is empty, not NaN", () => {
  assert.match(
    historyLine({ type: "analytics", granted: true, changedAt: new Date(at) })
      .when,
    /2026, \d\d:\d\d$/,
  );
  assert.equal(historyLine({ type: "analytics", granted: true }).when, "");
});
