import assert from "node:assert/strict";
import test from "node:test";

import {
  getSeoPageTypeConfig,
  SEO_PAGE_TYPE_CONFIGS,
} from "@/lib/seo/page-registry";

test("seo page registry covers all four page types", () => {
  assert.deepEqual(
    SEO_PAGE_TYPE_CONFIGS.map((config) => config.postType),
    ["use_case", "template", "alternative", "compare"],
  );
});

test("seo page registry exposes the expected route bases", () => {
  assert.equal(getSeoPageTypeConfig("use_case").routeBase, "/use-cases");
  assert.equal(getSeoPageTypeConfig("template").routeBase, "/templates");
  assert.equal(getSeoPageTypeConfig("alternative").routeBase, "/alternatives");
  assert.equal(getSeoPageTypeConfig("compare").routeBase, "/compare");
});
