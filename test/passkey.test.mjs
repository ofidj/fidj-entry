import { test } from "node:test";
import assert from "node:assert/strict";
import {
  passkeyAssertion,
  passkeyRegistration,
  passkeySupported,
} from "../dist/dom.js";

// The ceremony in the browser (v3 P1-4): the API speaks base64url JSON, the
// browser speaks ArrayBuffers. These carry one to the other both ways.
const bytes = (...values) => new Uint8Array(values).buffer;
// Node defines a read-only navigator; the test replaces it for the ceremony.
const setNavigator = (value) =>
  Object.defineProperty(globalThis, "navigator", {
    value,
    configurable: true,
    writable: true,
  });

test("a passkey sign-in turns the options into buffers and the answer into JSON", async () => {
  let asked;
  globalThis.window = { PublicKeyCredential: function () {} };
  setNavigator({
    credentials: {
      get: async (request) => {
        asked = request.publicKey;
        return {
          id: "cred",
          rawId: bytes(1, 2),
          type: "public-key",
          response: {
            clientDataJSON: bytes(3),
            authenticatorData: bytes(4),
            signature: bytes(5),
            userHandle: bytes(6),
          },
        };
      },
    },
  });
  assert.equal(passkeySupported(), true);
  const answer = await passkeyAssertion({ challenge: "AQI", rpId: "fidj.ovh" });
  assert.deepEqual([...new Uint8Array(asked.challenge)], [1, 2]);
  assert.equal(asked.rpId, "fidj.ovh");
  assert.deepEqual(answer, {
    id: "cred",
    rawId: "AQI",
    type: "public-key",
    response: {
      clientDataJSON: "Aw",
      authenticatorData: "BA",
      signature: "BQ",
      userHandle: "Bg",
    },
    clientExtensionResults: {},
  });
});

test("adding a passkey turns the creation options into buffers and the answer into JSON", async () => {
  let asked;
  setNavigator({
    credentials: {
      create: async (request) => {
        asked = request.publicKey;
        return {
          id: "cred",
          rawId: bytes(1),
          type: "public-key",
          response: {
            clientDataJSON: bytes(2),
            attestationObject: bytes(3),
            getTransports: () => ["internal"],
          },
        };
      },
    },
  });
  const answer = await passkeyRegistration({
    challenge: "AQ",
    user: { id: "Ag", name: "a@b.c", displayName: "A" },
    excludeCredentials: [{ id: "Aw", type: "public-key" }],
  });
  assert.deepEqual([...new Uint8Array(asked.user.id)], [2]);
  assert.deepEqual([...new Uint8Array(asked.excludeCredentials[0].id)], [3]);
  assert.equal(answer.response.attestationObject, "Aw");
  assert.deepEqual(answer.response.transports, ["internal"]);
});
