import assert from "node:assert/strict";
import test from "node:test";

import {
  SEO_SITEMAP_CONTENT_CONFIG,
  buildCanonicalUrl,
  shouldNoIndexContent,
  shouldIncludeInSitemap,
} from "@/lib/seo/metadata";
import { buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/lib/seo/jsonld";

test("builds canonical urls for default and non-default locales", () => {
  assert.equal(buildCanonicalUrl({ locale: "en", path: "/templates/demo" }), "https://sdanceai.com/templates/demo");
  assert.equal(buildCanonicalUrl({ locale: "zh", path: "/templates/demo" }), "https://sdanceai.com/zh/templates/demo");
});

test("marks draft or gated content as noindex", () => {
  assert.equal(
    shouldNoIndexContent({ status: "draft", visibility: "public" }),
    true,
  );
  assert.equal(
    shouldNoIndexContent({ status: "published", visibility: "subscribers" }),
    true,
  );
  assert.equal(
    shouldNoIndexContent({ status: "published", visibility: "public" }),
    false,
  );
});

test("builds breadcrumb json ld with ordered list items", () => {
  const jsonld = buildBreadcrumbJsonLd([
    { label: "Home", href: "https://sdanceai.com" },
    { label: "Templates", href: "https://sdanceai.com/templates" },
    { label: "Demo", href: "https://sdanceai.com/templates/demo" },
  ]);

  assert.deepEqual(jsonld, {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://sdanceai.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Templates",
        item: "https://sdanceai.com/templates",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Demo",
        item: "https://sdanceai.com/templates/demo",
      },
    ],
  });
});

test("omits faq json ld when there are no faq items", () => {
  assert.equal(buildFaqJsonLd(null), null);
  assert.equal(buildFaqJsonLd([]), null);
});

test("only includes published public seo content in sitemap", () => {
  assert.equal(
    shouldIncludeInSitemap({ status: "published", visibility: "public" }),
    true,
  );
  assert.equal(
    shouldIncludeInSitemap({ status: "draft", visibility: "public" }),
    false,
  );
  assert.equal(
    shouldIncludeInSitemap({ status: "published", visibility: "logged_in" }),
    false,
  );
});

test("registers all seo page types in sitemap content config", () => {
  assert.equal(
    SEO_SITEMAP_CONTENT_CONFIG.some((item) => item.postType === "use_case"),
    true,
  );
  assert.equal(
    SEO_SITEMAP_CONTENT_CONFIG.some((item) => item.postType === "template"),
    true,
  );
  assert.equal(
    SEO_SITEMAP_CONTENT_CONFIG.some((item) => item.postType === "alternative"),
    true,
  );
  assert.equal(
    SEO_SITEMAP_CONTENT_CONFIG.some((item) => item.postType === "compare"),
    true,
  );
});
