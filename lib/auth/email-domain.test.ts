import assert from "node:assert/strict";
import test from "node:test";

import {
  assertAllowedSignupEmail,
  isAllowedSignupEmail,
} from "@/lib/auth/email-domain";

test("allows gmail.com signup emails", () => {
  assert.equal(isAllowedSignupEmail("user@gmail.com"), true);
  assert.equal(isAllowedSignupEmail("USER@GMAIL.COM"), true);
});

test("allows tikdek.com signup emails", () => {
  assert.equal(isAllowedSignupEmail("user@tikdek.com"), true);
  assert.equal(isAllowedSignupEmail("USER@TIKDEK.COM"), true);
});

test("rejects non-gmail signup emails", () => {
  assert.equal(isAllowedSignupEmail("user@gusiil.my.id"), false);
  assert.throws(
    () => assertAllowedSignupEmail("user@gusiil.my.id"),
    /Only gmail.com or tikdek.com email addresses are allowed/,
  );
});
