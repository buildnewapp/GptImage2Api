import assert from "node:assert/strict";
import test from "node:test";

import {
  signPaymentHandoffToken,
  verifyPaymentHandoffToken,
} from "@/lib/payments/handoff";

const secret = "test-payment-handoff-secret";
const now = new Date("2026-07-08T00:00:00.000Z");

test("verifies a valid payment handoff token", () => {
  const token = signPaymentHandoffToken({
    payload: {
      checkout: {
        creemProductId: "prod_123",
        provider: "creem",
      },
      sourceHost: "seedance25free.com",
      userId: "11111111-1111-1111-1111-111111111111",
    },
    secret,
    now,
  });

  const payload = verifyPaymentHandoffToken({ token, secret, now });

  assert.equal(payload?.userId, "11111111-1111-1111-1111-111111111111");
  assert.equal(payload?.checkout.provider, "creem");
  assert.equal(payload?.checkout.creemProductId, "prod_123");
  assert.equal(payload?.sourceHost, "seedance25free.com");
});

test("rejects a tampered payment handoff token", () => {
  const token = signPaymentHandoffToken({
    payload: {
      checkout: {
        provider: "paypal",
        planId: "22222222-2222-2222-2222-222222222222",
      },
      userId: "11111111-1111-1111-1111-111111111111",
    },
    secret,
    now,
  });

  const tampered = `${token.slice(0, -1)}x`;

  assert.equal(verifyPaymentHandoffToken({ token: tampered, secret, now }), null);
});

test("rejects an expired payment handoff token", () => {
  const token = signPaymentHandoffToken({
    expiresInSeconds: 60,
    payload: {
      checkout: {
        provider: "stripe",
        stripePriceId: "price_123",
      },
      userId: "11111111-1111-1111-1111-111111111111",
    },
    secret,
    now,
  });

  const expiredNow = new Date(now.getTime() + 61_000);

  assert.equal(
    verifyPaymentHandoffToken({ token, secret, now: expiredNow }),
    null,
  );
});
