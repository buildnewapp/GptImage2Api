import assert from "node:assert/strict"
import test from "node:test"

import { buildCreemProductPayload } from "@/lib/db/seed/creem-product-sync"

test("builds Creem products with tax excluded from the listed price", () => {
  const payload = buildCreemProductPayload({
    planId: "pro-monthly",
    environment: "test",
    cardTitle: "Pro",
    cardDescription: "Pro plan",
    paymentType: "recurring",
    recurringInterval: "month",
    price: "9.99",
    currency: "USD",
  })

  assert.equal(payload.taxMode, "exclusive")
})
