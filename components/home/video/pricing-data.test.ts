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
