import assert from "node:assert/strict";
import test from "node:test";

import AiVideoModelPricingComparison from "@/components/home/template2/AiVideoModelPricingComparison";
import { renderToStaticMarkup } from "react-dom/server";

test("renders AI video model pricing table without usd price column", () => {
  const html = renderToStaticMarkup(
    <AiVideoModelPricingComparison locale="en" />,
  );

  assert.doesNotMatch(html, /USD Price/);
  assert.match(html, /Credit Price/);
  assert.match(html, /Billing Note/);
});
