import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPayPalWebhookVerificationPayload,
  decodePayPalCustomId,
  encodePayPalCustomId,
  getPayPalApprovalUrl,
  mapPayPalOrderStatus,
} from "@/lib/paypal";

test("encodes and decodes paypal custom id payload", () => {
  const encoded = encodePayPalCustomId({
    planId: "plan_123",
    userId: "user_456",
  });

  assert.deepEqual(decodePayPalCustomId(encoded), {
    planId: "plan_123",
    userId: "user_456",
  });
});

test("returns null for invalid paypal custom id payload", () => {
  assert.equal(decodePayPalCustomId("not-json"), null);
  assert.equal(decodePayPalCustomId("null"), null);
  assert.equal(decodePayPalCustomId('[123,"user",true]'), null);
});

test("round-trips checkout UUIDs within PayPal's custom id limit", () => {
  const payload = {
    planId: "11111111-1111-4111-8111-111111111111",
    userId: "22222222-2222-4222-8222-222222222222",
    checkoutOrderId: "33333333-3333-4333-8333-333333333333",
  };
  const encoded = encodePayPalCustomId(payload);
  assert.ok(encoded.length <= 127);
  assert.deepEqual(decodePayPalCustomId(encoded), payload);
});

test("extracts approval url from paypal links", () => {
  assert.equal(
    getPayPalApprovalUrl([
      { href: "https://api.example.com/self", rel: "self" },
      { href: "https://paypal.example.com/approve", rel: "approve" },
    ]),
    "https://paypal.example.com/approve",
  );
});

test("maps paypal order status to local order status", () => {
  assert.equal(mapPayPalOrderStatus("COMPLETED"), "succeeded");
  assert.equal(mapPayPalOrderStatus("completed"), "succeeded");
  assert.equal(mapPayPalOrderStatus("APPROVED"), "pending");
  assert.equal(mapPayPalOrderStatus("VOIDED"), "failed");
  assert.equal(mapPayPalOrderStatus("failed"), "failed");
  assert.equal(mapPayPalOrderStatus("UNKNOWN"), "pending");
});

test("builds webhook verification payload from headers", () => {
  const headers = new Headers({
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-cert-url": "https://api-m.paypal.com/certs/cert.pem",
    "paypal-transmission-id": "transmission-id",
    "paypal-transmission-sig": "transmission-sig",
    "paypal-transmission-time": "2026-04-13T10:00:00Z",
  });

  assert.deepEqual(
    buildPayPalWebhookVerificationPayload({
      body: { event_type: "PAYMENT.CAPTURE.COMPLETED" },
      headers,
      webhookId: "WH-123",
    }),
    {
      auth_algo: "SHA256withRSA",
      cert_url: "https://api-m.paypal.com/certs/cert.pem",
      transmission_id: "transmission-id",
      transmission_sig: "transmission-sig",
      transmission_time: "2026-04-13T10:00:00Z",
      webhook_event: {
        event_type: "PAYMENT.CAPTURE.COMPLETED",
      },
      webhook_id: "WH-123",
    },
  );
});
