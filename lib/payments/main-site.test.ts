import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  getPaymentPayUrl,
  isMainPaymentSite,
} from "@/lib/payments/main-site";

const originalEnv = {
  MAIN_SITE_URL: process.env.MAIN_SITE_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
};

function restoreEnvValue(key: keyof typeof originalEnv) {
  const value = originalEnv[key];
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

afterEach(() => {
  restoreEnvValue("MAIN_SITE_URL");
  restoreEnvValue("NEXT_PUBLIC_SITE_URL");
});

test("treats empty MAIN_SITE_URL as the payment main site", () => {
  delete process.env.MAIN_SITE_URL;

  assert.equal(isMainPaymentSite(), true);

  process.env.MAIN_SITE_URL = "   ";

  assert.equal(isMainPaymentSite(), true);
});

test("treats configured MAIN_SITE_URL as a sub site", () => {
  process.env.MAIN_SITE_URL = "https://tikdek.com";

  assert.equal(isMainPaymentSite(), false);
});

test("builds the handoff URL on the payment main site", () => {
  process.env.MAIN_SITE_URL = "https://tikdek.com/";

  assert.equal(
    getPaymentPayUrl("token-123"),
    "https://tikdek.com/api/payment/pay?token=token-123",
  );
});
