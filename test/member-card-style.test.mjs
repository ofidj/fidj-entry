import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const style = fs.readFileSync(
  new URL("../src/style.css", import.meta.url),
  "utf8",
);

// The member card a generated app draws — the same reading as Fidj's GDPR
// card — needs its rows, its ground tags and a switch that is a checkbox with
// role="switch": green when on, as the mockup draws it, never the browser's
// default checkbox.
test("the member card has rows, ground tags and a Fidj switch", () => {
  assert.match(style, /\.member-row\s*\{/);
  assert.match(style, /\.basis\s*\{/);
  assert.match(style, /\.basis\.consent\s*\{/);
  assert.match(style, /input\[role="switch"\]\s*\{[^}]*appearance:\s*none/);
  assert.match(
    style,
    /input\[role="switch"\]:checked\s*\{[^}]*var\(--fidj-ok\)/,
  );
});
