import assert from "node:assert/strict";
import test from "node:test";

import { buildPricingValueRows } from "@/components/home/video/pricing-value-data";

test("buildPricingValueRows calculates credits per dollar across active plans", () => {
  const rows = buildPricingValueRows({
    environment: "test",
    locale: "en",
    plans: [
      {
        environment: "test",
        groupSlug: "annual",
        cardTitle: "Standard",
        displayOrder: 1,
        isActive: true,
        isHighlighted: false,
        price: "118.80",
        benefitsJsonb: {
          monthlyCredits: 1600,
          totalMonths: 12,
        },
      },
      {
        environment: "test",
        groupSlug: "onetime",
        cardTitle: "Pro Pack",
        displayOrder: 2,
        isActive: true,
        isHighlighted: false,
        price: "29.90",
        benefitsJsonb: {
          oneTimeCredits: 3750,
        },
      },
    ],
  });

  assert.deepEqual(
    rows.map((row) => row.plan),
    [
      "Annual Standard",
      "Pro Pack",
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

test("buildPricingValueRows formats localized labels from supplied copy", () => {
  const rows = buildPricingValueRows({
    copy: {
      planLabels: {
        annual: "Yearly {planTitle}",
        monthly: "Monthly {planTitle}",
      },
      purchaseNotes: {
        recurring: "Single checkout",
        onetime: "Reusable pack",
      },
    },
    environment: "test",
    locale: "fr",
    plans: [
      {
        environment: "test",
        groupSlug: "annual",
        cardTitle: "Standard",
        displayOrder: 1,
        isActive: true,
        isHighlighted: false,
        price: "120",
        benefitsJsonb: {
          monthlyCredits: 100,
          totalMonths: 12,
        },
      },
      {
        environment: "test",
        groupSlug: "onetime",
        cardTitle: "Starter Pack",
        displayOrder: 2,
        isActive: true,
        isHighlighted: false,
        price: "10",
        benefitsJsonb: {
          oneTimeCredits: 100,
        },
      },
    ],
  });

  assert.deepEqual(
    rows.map((row) => [row.plan, row.purchaseNote]),
    [
      ["Yearly Standard", "Single checkout"],
      ["Starter Pack", "Reusable pack"],
    ],
  );
});
