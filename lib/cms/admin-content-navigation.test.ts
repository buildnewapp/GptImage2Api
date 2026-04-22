import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_CONTENT_TABS,
  getAdminContentTabByHref,
} from "@/lib/cms/admin-content-navigation";

test("admin content tabs expose the six seo content routes in the expected order", () => {
  assert.deepEqual(
    ADMIN_CONTENT_TABS.map((tab) => ({
      key: tab.key,
      labelKey: tab.labelKey,
      href: tab.href,
    })),
    [
      { key: "blogs", labelKey: "blogs", href: "/dashboard/blogs" },
      { key: "glossary", labelKey: "glossary", href: "/dashboard/glossary" },
      { key: "compare", labelKey: "compare", href: "/dashboard/compare" },
      { key: "templates", labelKey: "templates", href: "/dashboard/templates" },
      {
        key: "alternatives",
        labelKey: "alternatives",
        href: "/dashboard/alternatives",
      },
      {
        key: "useCases",
        labelKey: "useCases",
        href: "/dashboard/use-cases",
      },
    ],
  );
});

test("resolves the active admin content tab from a dashboard href", () => {
  assert.deepEqual(getAdminContentTabByHref("/dashboard/templates"), {
    key: "templates",
    labelKey: "templates",
    label: "Templates",
    href: "/dashboard/templates",
  });

  assert.equal(getAdminContentTabByHref("/dashboard/users"), null);
});
