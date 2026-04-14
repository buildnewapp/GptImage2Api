import assert from "node:assert/strict";
import test from "node:test";

import { buildPricingValueRows } from "@/components/home/template2/pricing-value-data";

test("buildPricingValueRows calculates credits per dollar across active plans", () => {
  const rows = buildPricingValueRows({
    environment: "test",
    locale: "en",
  });

  assert.deepEqual(
    rows.map((row) => row.plan),
    [
      "Annual Standard",
      "Annual Pro",
      "Annual Max",
      "Monthly Standard",
      "Monthly Pro",
      "Monthly Max",
      "Standard Pack",
      "Pro Pack",
      "Max Pack",
    ]
  );

  const annualStandard = rows.find((row) => row.plan === "Annual Standard");
  const proPack = rows.find((row) => row.plan === "Pro Pack");

  assert.ok(annualStandard);
  assert.equal(annualStandard.credits, 19200);
  assert.equal(annualStandard.creditsPerDollar, "161.6162");
  assert.equal(annualStandard.dollarsPerCredit, "0.006187");
  assert.equal(annualStandard.price, "$118.80");
  assert.equal(annualStandard.purchaseNote, "Purchase once");

  assert.ok(proPack);
  assert.equal(proPack.credits, 3750);
  assert.equal(proPack.creditsPerDollar, "125.4181");
  assert.equal(proPack.dollarsPerCredit, "0.007973");
  assert.equal(proPack.purchaseNote, "Repeat purchase");
});
