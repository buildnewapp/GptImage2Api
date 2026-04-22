import assert from "node:assert/strict";
import test from "node:test";

import { stripModelDetailPricingFields } from "@/lib/ai-studio/public";

test("strips internal pricing fields from model detail pricing rows", () => {
  const detail = stripModelDetailPricingFields({
    id: "video:bytedance-seedance-1-5-pro",
    pricingRows: [
      {
        modelDescription: "Bytedance Seedance 1.5 Pro, 720p, 4s, no audio",
        interfaceType: "video",
        provider: "ByteDance",
        creditPrice: "14",
        creditUnit: "per video",
        usdPrice: "0.07",
        falPrice: "",
        discountRate: 0,
        discountPrice: false,
        runtimeModel: "seedance-1-5-pro",
      },
    ],
  });

  assert.deepEqual(detail.pricingRows, [
    {
      interfaceType: "video",
      provider: "ByteDance",
      creditPrice: "14",
      creditUnit: "per video",
      runtimeModel: "seedance-1-5-pro",
    },
  ]);
});
