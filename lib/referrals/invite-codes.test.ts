import assert from "node:assert/strict";
import test from "node:test";

import {
  generateInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
} from "@/lib/referrals/invite-codes";

test("normalizes invite code input to uppercase alphanumeric format", () => {
  assert.equal(normalizeInviteCode(" ab-c_12 "), "ABC12");
});

test("rejects invite codes shorter than the minimum length", () => {
  assert.equal(isValidInviteCode("ABC"), false);
});

test("accepts invite codes within the supported format and length", () => {
  assert.equal(isValidInviteCode("ABCD12"), true);
});

test("generates deterministic uppercase invite code suffixes from user ids", () => {
  const code = generateInviteCode("550e8400-e29b-41d4-a716-446655440000");

  assert.match(code, /^[A-Z0-9]{6,12}$/);
});
