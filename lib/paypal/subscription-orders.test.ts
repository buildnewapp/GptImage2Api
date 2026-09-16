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
        periodEnd: new Date("2026-09-14T10:00:00Z"),
      },
      paymentEventId: "PAY-1",
      paymentEventTime: "2026-08-13T17:51:32Z",
    }),
    "attach_to_initial",
  );

  assert.equal(
    getPayPalSubscriptionPaymentEventAction({
      existingInitialOrder: {
        paymentId: "PAY-1",
        periodEnd: new Date("2026-09-14T10:00:00Z"),
      },
      paymentEventId: "PAY-1",
    }),
    "noop",
  );

  assert.equal(
    getPayPalSubscriptionPaymentEventAction({
      existingInitialOrder: {
        paymentId: "PAY-1",
        periodEnd: new Date("2026-09-14T10:00:00Z"),
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

test("a renewal is not attached to an initial order whose payment webhook was missed", () => {
  assert.equal(
    getPayPalSubscriptionPaymentEventAction({
      existingInitialOrder: {
        paymentId: null,
        periodEnd: new Date("2026-09-14T10:00:00Z"),
      },
      paymentEventId: "PAY-RENEWAL",
      paymentEventTime: "2026-09-14T11:00:22Z",
    }),
    "create_renewal",
  );
});

test("a payment at the initial period end starts a renewal", () => {
  assert.equal(
    getPayPalSubscriptionPaymentEventAction({
      existingInitialOrder: {
        paymentId: null,
        periodEnd: new Date("2026-09-14T10:00:00Z"),
      },
      paymentEventId: "PAY-RENEWAL",
      paymentEventTime: "2026-09-14T10:00:00Z",
    }),
    "create_renewal",
  );
});

test("a delayed first payment is matched by its payment time", () => {
  assert.equal(
    getPayPalSubscriptionPaymentEventAction({
      existingInitialOrder: {
        paymentId: null,
        periodEnd: new Date("2026-09-14T10:00:00Z"),
      },
      paymentEventId: "PAY-INITIAL",
      paymentEventTime: "2026-08-13T17:51:32Z",
    }),
    "attach_to_initial",
  );
});

test("missing payment dates or initial periods fail instead of silently consuming renewals", () => {
  for (const paymentEventTime of [undefined, "invalid"]) {
    assert.throws(() => getPayPalSubscriptionPaymentEventAction({
      existingInitialOrder: {
        paymentId: null,
        periodEnd: new Date("2026-09-14T10:00:00Z"),
      },
      paymentEventId: "PAY-RENEWAL",
      paymentEventTime,
    }), /Unable to determine/);
  }

  assert.throws(() => getPayPalSubscriptionPaymentEventAction({
    existingInitialOrder: { paymentId: null, periodEnd: null },
    paymentEventId: "PAY-RENEWAL",
    paymentEventTime: "2026-09-14T11:00:22Z",
  }), /Unable to determine/);
});

test("paypal subscription orders use recurring order type to match creem", () => {
  assert.equal(ORDER_TYPES.RECURRING, "recurring");
});
