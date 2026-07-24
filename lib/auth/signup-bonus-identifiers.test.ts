import assert from "node:assert/strict";
import test from "node:test";

import {
  parseSignupBonusFingerprint,
  resolveSignupBonusClientIp,
} from "@/lib/auth/signup-bonus-identifiers";
import {
  buildSignupBonusFingerprintCookie,
  ensureSignupBonusFingerprint,
} from "@/lib/auth/signup-bonus-fingerprint";

test("accepts a FingerprintJS visitor ID", () => {
  assert.equal(
    parseSignupBonusFingerprint("0123456789ABCDEF0123456789ABCDEF"),
    "0123456789abcdef0123456789abcdef",
  );
});

test("rejects a missing or malformed FingerprintJS visitor ID", () => {
  assert.equal(parseSignupBonusFingerprint(null), null);
  assert.equal(parseSignupBonusFingerprint("short"), null);
  assert.equal(
    parseSignupBonusFingerprint("0123456789abcdef0123456789abcdeg"),
    null,
  );
});

test("uses a valid Cloudflare connecting IP", () => {
  const headers = new Headers({
    "cf-connecting-ip": " 203.0.113.8 ",
    "x-real-ip": "198.51.100.2",
    "x-forwarded-for": "192.0.2.4",
  });

  assert.equal(resolveSignupBonusClientIp(headers), "203.0.113.8");
});

test("does not trust fallback IP headers", () => {
  const headers = new Headers({
    "x-real-ip": "198.51.100.2",
    "x-forwarded-for": "192.0.2.4",
  });

  assert.equal(resolveSignupBonusClientIp(headers), null);
});

test("rejects an invalid Cloudflare connecting IP", () => {
  const headers = new Headers({
    "cf-connecting-ip": "not-an-ip",
  });

  assert.equal(resolveSignupBonusClientIp(headers), null);
});

test("builds a secure 30-day signup bonus fingerprint cookie", () => {
  assert.equal(
    buildSignupBonusFingerprintCookie(
      "0123456789abcdef0123456789abcdef",
      true,
    ),
    "signup_bonus_fingerprint=0123456789abcdef0123456789abcdef; Path=/; Max-Age=2592000; SameSite=Lax; Secure",
  );
});

test("initializes the signup bonus fingerprint with a browser environment", async () => {
  let writtenCookie = "";

  const initialized = await ensureSignupBonusFingerprint({
    loadVisitorId: async () => "0123456789abcdef0123456789abcdef",
    writeCookie: (cookie) => {
      writtenCookie = cookie;
    },
    secure: true,
  });

  assert.equal(initialized, true);
  assert.match(writtenCookie, /^signup_bonus_fingerprint=/);
  assert.match(writtenCookie, /; Secure$/);
});

test("fingerprint failures never reject the authentication flow", async () => {
  const loadFailed = await ensureSignupBonusFingerprint({
    loadVisitorId: () => {
      throw new Error("fingerprint blocked");
    },
    writeCookie: () => {},
    secure: true,
  });
  const cookieFailed = await ensureSignupBonusFingerprint({
    loadVisitorId: async () => "0123456789abcdef0123456789abcdef",
    writeCookie: () => {
      throw new Error("cookies blocked");
    },
    secure: true,
  });

  assert.equal(loadFailed, false);
  assert.equal(cookieFailed, false);
});
