import assert from "node:assert/strict";
import test from "node:test";

import {
  getAvailableCheckoutProviders,
  hasUsableProviderId,
} from "@/lib/payments/checkout-availability";

test("ignores empty and placeholder provider ids", () => {
  assert.equal(hasUsableProviderId(""), false);
  assert.equal(hasUsableProviderId("TODO_UPDATE_STRIPE_PRICE_ID"), false);
  assert.equal(hasUsableProviderId("price_123"), true);
});

test("returns all configured one-time checkout providers", () => {
  const providers = getAvailableCheckoutProviders(
    {
      creemProductId: "prod_123",
      currency: "USD",
      provider: "all",
      paymentType: "one_time",
      price: "12.00",
      stripePriceId: "price_123",
    },
    {
      nowpaymentsEnabled: true,
      paypalEnabled: true,
    },
  );

  assert.deepEqual(providers, ["creem", "paypal", "nowpayments", "stripe"]);
});

test("only exposes choice providers for all-provider plans", () => {
  const providers = getAvailableCheckoutProviders(
    {
      provider: "stripe",
      stripePriceId: "price_123",
    },
    {
      paypalEnabled: true,
    },
  );

  assert.deepEqual(providers, []);
});

test("requires paypal plan id for recurring paypal checkout", () => {
  assert.deepEqual(
    getAvailableCheckoutProviders(
      {
        currency: "USD",
        paymentType: "recurring",
        price: "12.00",
      },
      {
        paypalEnabled: true,
      },
    ),
    [],
  );

  assert.deepEqual(
    getAvailableCheckoutProviders(
      {
        currency: "USD",
        paypalPlanId: "P-123",
        paymentType: "recurring",
        price: "12.00",
      },
      {
        paypalEnabled: true,
      },
    ),
    ["paypal"],
  );
});

test("exposes nowpayments for priced plans", () => {
  assert.deepEqual(
    getAvailableCheckoutProviders(
      {
        currency: "USD",
        provider: "all",
        paymentType: "recurring",
        price: "12.00",
      },
      {
        nowpaymentsEnabled: true,
      },
    ),
    ["nowpayments"],
  );

  assert.deepEqual(
    getAvailableCheckoutProviders(
      {
        currency: "USD",
        provider: "all",
        paymentType: "onetime",
        price: "12.00",
      },
      {
        nowpaymentsEnabled: true,
      },
    ),
    ["nowpayments"],
  );
});

test("does not expose nowpayments for non-USD plans", () => {
  assert.deepEqual(
    getAvailableCheckoutProviders(
      {
        currency: "EUR",
        provider: "all",
        paymentType: "onetime",
        price: "12.00",
      },
      {
        nowpaymentsEnabled: true,
      },
    ),
    [],
  );
});
