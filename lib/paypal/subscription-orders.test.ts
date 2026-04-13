import assert from "node:assert/strict";
import test from "node:test";

import {
  getInitialPayPalSubscriptionOrderKey,
  getPayPalSubscriptionPaymentEventAction,
  resolvePayPalSubscriptionOrderAmount,
  shouldCreateInitialPayPalSubscriptionOrder,
} from "@/lib/paypal/subscription-orders";
import { ORDER_TYPES } from "@/lib/payments/provider-utils";

test("creates an initial order key from subscription id", () => {
  assert.equal(
    getInitialPayPalSubscriptionOrderKey("I-ABC123"),
    "I-ABC123:initial",
  );
});

test("uses last payment amount before plan price fallback", () => {
  assert.equal(
    resolvePayPalSubscriptionOrderAmount({
      lastPaymentAmount: "59.90",
      planPrice: "39.90",
    }),
    "59.90",
  );

  assert.equal(
    resolvePayPalSubscriptionOrderAmount({
      lastPaymentAmount: undefined,
      planPrice: "39.90",
    }),
    "39.90",
  );
});

test("active subscriptions without an initial order should create one", () => {
  assert.equal(
    shouldCreateInitialPayPalSubscriptionOrder({
      hasInitialOrder: false,
      status: "active",
    }),
    true,
  );
});

test("payment completed attaches to initial order before creating renewals", () => {
  assert.equal(
    getPayPalSubscriptionPaymentEventAction({
      existingInitialOrder: {
        paymentId: null,
      },
      paymentEventId: "PAY-1",
    }),
    "attach_to_initial",
  );

  assert.equal(
    getPayPalSubscriptionPaymentEventAction({
      existingInitialOrder: {
        paymentId: "PAY-1",
      },
      paymentEventId: "PAY-1",
    }),
    "noop",
  );

  assert.equal(
    getPayPalSubscriptionPaymentEventAction({
      existingInitialOrder: {
        paymentId: "PAY-1",
      },
      paymentEventId: "PAY-2",
    }),
    "create_renewal",
  );

  assert.equal(
    getPayPalSubscriptionPaymentEventAction({
      existingInitialOrder: null,
      paymentEventId: "PAY-1",
    }),
    "create_initial",
  );
});

test("paypal subscription orders use recurring order type to match creem", () => {
  assert.equal(ORDER_TYPES.RECURRING, "recurring");
});
