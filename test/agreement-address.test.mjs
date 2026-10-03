import { test } from "node:test";
import assert from "node:assert/strict";
import { agreementAddress, agreementFromRefusal } from "../dist/index.js";

// Every surface used to rebuild the agreement's address itself, and none could
// know which language the person had been shown. The API now hands the address
// with the agreement; following it opens the very text that was read.
const refusal = (agreement) => ({
  code: 409,
  reason: "agreement_required",
  details: { agreement },
});

test("keeps the address and the language the refusal carried", () => {
  const agreement = agreementFromRefusal(
    refusal({
      version: "2026.10",
      text: "Texte",
      language: "fr",
      href: "/apps/fidj/agreements/2026.10?lang=fr",
    }),
  );
  assert.deepEqual(agreement, {
    version: "2026.10",
    text: "Texte",
    language: "fr",
    href: "/apps/fidj/agreements/2026.10?lang=fr",
  });
});

test("addresses the agreement through the link the API handed", () => {
  assert.equal(
    agreementAddress("https://api.example/v3", "app-a", {
      version: "2026.10",
      href: "/apps/app-a/agreements/2026.10?lang=en",
    }),
    "https://api.example/v3/apps/app-a/agreements/2026.10?lang=en",
  );
});

test("builds the address itself from an older API that sends no link", () => {
  assert.equal(
    agreementAddress("https://api.example/v3/", "app a", { version: "v 1" }),
    "https://api.example/v3/apps/app%20a/agreements/v%201",
  );
});
