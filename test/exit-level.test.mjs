import { test } from "node:test";
import assert from "node:assert/strict";
import {
  exitClassNotice,
  exitConductLine,
  exitLevelModel,
  formatDate,
} from "../dist/index.js";

// An app's public page explains its exit class: the scale, where the app
// sits on it, and the rule that put it there.

test("the scale reads from deletion by API to contact only", () => {
  const model = exitLevelModel({ level: "B", basis: "membership" });
  assert.deepEqual(
    model.scale.map(({ level, name }) => [level, name]),
    [
      ["A", "Deletion by API"],
      ["B", "Revocation by API"],
      ["C", "Documented web procedure"],
      ["D", "Contact only"],
      ["E", "No channel found"],
    ],
  );
  assert.deepEqual(
    model.scale.filter((step) => step.current).map((step) => step.level),
    ["B"],
  );
  assert.equal(model.level, "B");
  assert.equal(model.name, "Revocation by API");
});

test("each class says why the app has it", () => {
  assert.match(
    exitLevelModel({ level: "A", basis: "handler" }).reason,
    /handler/,
  );
  assert.match(
    exitLevelModel({ level: "B", basis: "membership" }).reason,
    /no handler/,
  );
  assert.match(exitLevelModel({ level: "A", basis: "fidj" }).reason, /Fidj/);
  assert.match(
    exitLevelModel({ level: "C", basis: "account-deletion" }).reason,
    /procedure/,
  );
  assert.match(
    exitLevelModel({ level: "D", basis: "contact" }).reason,
    /write/,
  );
});

test("a candidate is not on the scale yet", () => {
  const model = exitLevelModel({ level: "candidate", basis: "api-candidate" });
  assert.equal(model.name, "API not usable yet");
  assert.equal(
    model.scale.some((step) => step.current),
    false,
  );
});

test("an app without a class has nothing to explain", () => {
  assert.equal(exitLevelModel(undefined), null);
});

// Every step of the scale can be opened: a reader on a B app can ask what A,
// C and D would mean, not only why this app is B.
test("each step of the scale says what its class means", () => {
  const model = exitLevelModel({ level: "B", basis: "membership" });
  for (const step of model.scale) {
    assert.ok(step.meaning.length > 40, step.level);
  }
  assert.match(model.scale[0].meaning, /API/);
  assert.match(model.scale[3].meaning, /write/);
  assert.match(model.scale[4].meaning, /found/);
  assert.equal(new Set(model.scale.map((step) => step.meaning)).size, 5);
});

test("a service where nothing was found to write to is E, and says so", () => {
  const model = exitLevelModel({ level: "E", basis: "no-channel" });
  assert.equal(model.name, "No channel found");
  assert.match(model.reason, /No deletion procedure, address or form/);
});

// How the service answered, beside its class and never inside it.
test("the answers a service gave are counted in one sentence", () => {
  assert.equal(
    exitConductLine({ settled: 5, answered: 2, refused: 1, unanswered: 2 }),
    "Of 5 settled requests sent through Fidj: 2 answered, 1 refused, 2 unanswered past the deadline.",
  );
  assert.equal(exitConductLine(undefined), "");
});

// Fidj's class, said as such: never a GDPR certification, never a verdict.
test("the class says it is Fidj's, not a GDPR certification", () => {
  assert.match(exitClassNotice, /Fidj/);
  assert.match(
    exitClassNotice,
    /not a certification under GDPR Articles 42 and 43/,
  );
});

// A service card's class rests on a dated, sourced finding, shown beside it.
test("a sourced finding is dated beside the class", () => {
  const model = exitLevelModel({
    level: "E",
    basis: "no-channel",
    observedAt: "2026-10-09T10:00:00.000Z",
    source: "https://nowhere.example/legal",
  });
  assert.deepEqual(model.finding, {
    date: formatDate("2026-10-09T10:00:00.000Z"),
    source: "https://nowhere.example/legal",
  });
  assert.equal(
    exitLevelModel({ level: "B", basis: "membership" }).finding,
    null,
  );
});
