import assert from "node:assert/strict";
import test from "node:test";

import {
  computeNowpaymentsSignature,
  extractNowpaymentsOrderNo,
  extractNowpaymentsPaymentId,
  getNowpaymentsSessionId,
  mapNowpaymentsStatusToOrderStatus,
  verifyNowpaymentsSignature,
} from "@/lib/nowpayments";

test("maps finished and confirmed to succeeded", () => {
  assert.equal(mapNowpaymentsStatusToOrderStatus("finished"), "succeeded");
  assert.equal(mapNowpaymentsStatusToOrderStatus("confirmed"), "succeeded");
});

test("maps failed-like states to failed", () => {
  assert.equal(mapNowpaymentsStatusToOrderStatus("failed"), "failed");
  assert.equal(mapNowpaymentsStatusToOrderStatus("expired"), "failed");
  assert.equal(mapNowpaymentsStatusToOrderStatus("refunded"), "failed");
});

test("maps unknown states to pending", () => {
  assert.equal(mapNowpaymentsStatusToOrderStatus("waiting"), "pending");
  assert.equal(mapNowpaymentsStatusToOrderStatus("sending"), "pending");
  assert.equal(mapNowpaymentsStatusToOrderStatus(""), "pending");
});

test("extracts order no from order_id first", () => {
  assert.equal(
    extractNowpaymentsOrderNo({
      order_id: "np_order_123",
      order_description: "order_no:backup_1",
    }),
    "np_order_123",
  );
});

test("extracts order no from order description as fallback", () => {
  assert.equal(
    extractNowpaymentsOrderNo({
      order_description: "foo; order_no:np_order_456; bar",
    }),
    "np_order_456",
  );
});

test("extracts payment id from string or number payloads", () => {
  assert.equal(extractNowpaymentsPaymentId({ payment_id: "pay_123" }), "pay_123");
  assert.equal(extractNowpaymentsPaymentId({ payment_id: 12345 }), "12345");
  assert.equal(extractNowpaymentsPaymentId({}), "");
});

test("prefers payment_id and falls back to invoice id for session id", () => {
  assert.equal(getNowpaymentsSessionId({ payment_id: "pay_1", id: "inv_1" }), "pay_1");
  assert.equal(getNowpaymentsSessionId({ id: "inv_1" }), "inv_1");
  assert.equal(getNowpaymentsSessionId({ id: 123 }), "123");
  assert.equal(getNowpaymentsSessionId({}), "");
});

test("verifies signature against canonical sorted payload", () => {
  const payload = {
    b: 2,
    a: {
      d: 4,
      c: 3,
    },
  };

  const signature = computeNowpaymentsSignature(payload, "secret");

  assert.equal(
    verifyNowpaymentsSignature({
      payload: {
        a: {
          c: 3,
          d: 4,
        },
        b: 2,
      },
      secret: "secret",
      signature,
    }),
    true,
  );
});

test("rejects invalid nowpayments signatures", () => {
  assert.equal(
    verifyNowpaymentsSignature({
      payload: { a: 1 },
      secret: "secret",
      signature: "deadbeef",
    }),
    false,
  );
});
