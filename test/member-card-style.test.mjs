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

// A choice row is a <label> (so the whole row toggles the switch), and the
// shell captions every label with `body:not(.has-module) label` — mono,
// uppercase, display:block. The row has to outrank that rule, or "Analytics"
// reads as a caption and the switch drops under its text.
test("a choice row outranks the shell's caption rule", () => {
  const rule = style.match(/\.member-rows \.member-row\s*\{([^}]*)\}/);
  assert.ok(rule, "no .member-rows .member-row rule");
  assert.match(rule[1], /display:\s*flex/);
  assert.match(rule[1], /text-transform:\s*none/);
  assert.match(rule[1], /font-family:\s*var\(--fidj-font-sans\)/);
});

// A button in a row keeps its own width: the Studio Notes starter styles its
// buttons at full width, which stretched "Accept" across the whole card.
test("a button in a member row keeps its own width", () => {
  assert.match(
    style,
    /\.member-row > button\s*\{[^}]*flex:\s*none[^}]*width:\s*auto/,
  );
});
