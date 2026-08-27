import assert from "node:assert/strict";
import test from "node:test";

import {
  isGeneratedPasskeyName,
  PASSKEY_AUTHENTICATOR_AAGUIDS_URL,
} from "../lib/passkey-authenticators.ts";

test("uses the Passkey Developer AAGUID catalog", () => {
  assert.equal(
    PASSKEY_AUTHENTICATOR_AAGUIDS_URL,
    "https://raw.githubusercontent.com/passkeydeveloper/passkey-authenticator-aaguids/main/aaguid.json",
  );
});

test("distinguishes generated passkey labels from user labels", () => {
  for (const name of [
    "This device",
    "Security key",
    "Passkey",
    "Passkey deadbeef",
  ]) {
    assert.equal(isGeneratedPasskeyName(name), true);
  }
  for (const name of ["Travel passkey", "Passkey phone", "Passkey DEADBEEF"]) {
    assert.equal(isGeneratedPasskeyName(name), false);
  }
});
