import assert from "node:assert/strict";
import test from "node:test";

import AiVideoModelPricingTable from "@/components/home/video/AiVideoModelPricingTable";
import { buildAiVideoModelPricingGroups } from "@/components/home/video/ai-video-model-pricing-data";
import commonMessagesEn from "@/i18n/messages/en/common.json";
import { renderToStaticMarkup } from "react-dom/server";

test("renders AI video model pricing table without usd price column", () => {
  const messages = commonMessagesEn.VideoPricing.dynamic.modelPricing;
  const html = renderToStaticMarkup(
    <AiVideoModelPricingTable
      copy={{
        ...messages.columns,
        fixedUnit: messages.units.fixed,
        hot: messages.filters.hot,
        modelCount: messages.modelCount,
        perImageUnit: messages.units.perImage,
        perSecondUnit: messages.units.perSecond,
        searchPlaceholder: messages.searchPlaceholder,
        special: messages.filters.special,
      }}
      groups={buildAiVideoModelPricingGroups({
        copy: messages,
        locale: "en",
      })}
    />,
  );

  assert.doesNotMatch(html, /USD Price/);
  assert.match(html, /Credit Price/);
  assert.match(html, /Billing Note/);
});
