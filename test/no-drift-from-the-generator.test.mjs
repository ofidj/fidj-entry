import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

// Until generator-fidj imports this package, its template still carries its own
// copies and builds from them. That is a duplication with a deadline, and this
// is the deadline's alarm: while both exist they must be identical, so nothing
// can be fixed on one side only. Delete this file in the same change that
// deletes the generator's copies.
const template =
  (process.env.FIDJ_GENERATOR_DIR || "../generator-fidj") +
  "/generators/app/templates/typescript/src/";

const shared = [
  ["src/service-agreement.ts", "service-agreement.ts"],
  ["src/provider-window.ts", "provider-window.ts"],
  ["src/version.ts", "version.ts"],
  ["src/tokens.css", "tokens.css"],
  ["src/fonts.css", "fonts.css"],
  ["src/style.css", "style.css"],
];

for (const [mine, theirs] of shared) {
  test(`${mine} still matches the generator's copy`, async (t) => {
    if (!existsSync(template + theirs))
      return t.skip("generator-fidj is not checked out beside this repository");
    const [here, there] = await Promise.all([
      readFile(mine, "utf8"),
      readFile(template + theirs, "utf8"),
    ]);
    assert.equal(
      here,
      there,
      `${mine} has drifted from generator-fidj. Until the generator imports @ofidj/entry, a change belongs in both or in neither.`,
    );
  });
}
