import assert from "node:assert/strict";
import test from "node:test";

import {
  extractInviteCodeFromSearch,
  shouldPersistInviteCode,
} from "@/lib/referrals/cookie";

test("extracts and normalizes invite codes from search params", () => {
  const inviteCode = extractInviteCodeFromSearch("?invite=ab-c12");

  assert.equal(inviteCode, "ABC12");
});

test("returns null when invite code is missing or invalid", () => {
  assert.equal(extractInviteCodeFromSearch("?foo=bar"), null);
  assert.equal(extractInviteCodeFromSearch("?invite=%20ab"), null);
});

test("persists a new invite code when no existing cookie is present", () => {
  assert.equal(shouldPersistInviteCode(null, "ABC123"), true);
});

test("does not overwrite an existing invite code with the same or empty value", () => {
  assert.equal(shouldPersistInviteCode("ABC123", "ABC123"), false);
  assert.equal(shouldPersistInviteCode("ABC123", null), false);
});
