import assert from "node:assert/strict";
import test from "node:test";

import { buildVideoTemplatePricingSection } from "@/components/home/video/pricing-data";
import type { VideoTemplatePricing } from "@/components/home/video/types";

const baseSection: VideoTemplatePricing = {
  comparisonRows: [],
  comparisonTitle: "",
  creditPacks: [],
  creditPacksDescription: "",
  creditPacksTitle: "",
  description: "",
  monthlyLabel: "",
  plans: [],
  saveLabel: "Save",
  title: "",
  yearlyLabel: "",
};

test("buildVideoTemplatePricingSection defaults to live plans when PAY_ENV is live", () => {
  const originalPayEnv = process.env.PAY_ENV;
  process.env.PAY_ENV = "live";

  try {
    const section = buildVideoTemplatePricingSection({
      baseSection,
      locale: "en",
      plans: [
        {
          id: "test-annual-plan",
          environment: "live",
          groupSlug: "annual",
          cardTitle: "Fixture",
          displayOrder: 1,
          displayPrice: "$1.00",
          isActive: true,
          isHighlighted: false,
        },
      ],
    });

    assert.equal(
      section.yearlyPlans?.[0]?.checkoutPlan?.planId,
      "test-annual-plan",
    );
  } finally {
    process.env.PAY_ENV = originalPayEnv;
  }
});

test("buildVideoTemplatePricingSection formats generated labels from supplied copy", () => {
  const section = buildVideoTemplatePricingSection({
    baseSection,
    copy: {
      billing: {
        annual: "Annual charge {amount}",
        monthly: "Monthly charge {amount}",
      },
      credits: {
        monthly: "{credits} credits each month",
        oneTime: "{credits} credits once",
      },
      savings: "Up to {percent}% off",
    },
    environment: "test",
    locale: "fr",
    plans: [
      {
        id: "test-annual-plan",
        environment: "test",
        groupSlug: "annual",
        cardTitle: "Fixture",
        displayOrder: 1,
        isActive: true,
        isHighlighted: false,
        price: "120",
        currency: "USD",
        benefitsJsonb: {
          monthlyCredits: 100,
          totalMonths: 12,
        },
      },
      {
        id: "test-monthly-plan",
        environment: "test",
        groupSlug: "monthly",
        cardTitle: "Fixture",
        displayOrder: 1,
        isActive: true,
        isHighlighted: false,
        price: "12",
        currency: "USD",
        benefitsJsonb: {
          monthlyCredits: 100,
        },
      },
    ],
  });

  assert.equal(section.yearlyPlans?.[0]?.billed, "Annual charge USD 120");
  assert.equal(section.yearlyPlans?.[0]?.credits, "100 credits each month");
  assert.equal(section.saveLabel, "Up to 17% off");
});
