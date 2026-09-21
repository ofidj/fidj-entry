import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const style = fs.readFileSync(
  new URL("../src/style.css", import.meta.url),
  "utf8",
);

// This stylesheet is loaded by the whole document, and the Fidj console is
// mounted inside that document. A rule on the bare `label` element therefore
// claims every label on the page, including the ones the console uses as row
// titles rather than as field captions — which is how "Analytics" came out as
// "ANALYTICS" in mono small-caps on the GDPR tab. A class on the console's side
// does not win it back: `.title` sets a size and a weight, not a
// text-transform, so the element selector keeps the last word.
//
// The caption styling belongs to the fields it was written for.
test("the field caption styling does not claim every label in the document", () => {
  const bare = /(^|\})\s*label\s*\{/.test(style);

  assert.equal(
    bare,
    false,
    "style.css styles the bare `label` element, which reaches every label in " +
      "any page that loads this stylesheet. Scope it away from a mounted module.",
  );
});

test("the shell's own fields still get the caption styling", () => {
  const scoped =
    style.match(/body:not\(\.has-module\)\s+label\s*\{[\s\S]*?\}/)?.[0] || "";

  assert.match(scoped, /text-transform:\s*uppercase/);
  assert.match(scoped, /font-family:\s*var\(--fidj-font-mono\)/);
});
