import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const style = fs.readFileSync(
  new URL("../src/style.css", import.meta.url),
  "utf8",
);

test("every selected generated-app tab has the white active underline", () => {
  const buttons =
    style.match(/\.topbar \.content-nav button \{[\s\S]*?\}/)?.[0] || "";
  const selected =
    style.match(/\.topbar \.content-nav button\.selected \{[\s\S]*?\}/)?.[0] ||
    "";
  const nav = style.match(/\.topbar \.content-nav \{[\s\S]*?\}/)?.[0] || "";

  assert.match(nav, /align-self:\s*stretch/);
  assert.match(buttons, /height:\s*100%/);
  assert.match(buttons, /border-bottom:\s*2px solid transparent/);
  assert.match(selected, /border-bottom-color:\s*var\(--fidj-on-ink\)/);
});
