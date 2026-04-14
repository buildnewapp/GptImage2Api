import assert from "node:assert/strict";
import test from "node:test";

import { buildHomeTemplate2PricingSection } from "@/components/home/template2/pricing-data";
import type { HomeTemplate2Pricing } from "@/components/home/template2/types";

const baseSection: HomeTemplate2Pricing = {
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

test("buildHomeTemplate2PricingSection defaults to live plans when PAY_ENV is live", () => {
  const originalPayEnv = process.env.PAY_ENV;
  process.env.PAY_ENV = "live";

  try {
    const section = buildHomeTemplate2PricingSection({
      baseSection,
      locale: "en",
    });

    assert.equal(
      section.yearlyPlans?.[0]?.checkoutPlan?.planId,
      "58f8aa44-b082-4f7d-93f0-e11d0e25b817",
    );
  } finally {
    process.env.PAY_ENV = originalPayEnv;
  }
});
