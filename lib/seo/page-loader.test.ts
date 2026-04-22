import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSeoPageOgPath,
  buildSeoPagePath,
  buildSeoPageRelatedLinks,
  resolveSeoPageAvailableLocales,
} from "@/lib/seo/page-loader";

test("builds detail paths from the seo page registry", () => {
  assert.equal(
    buildSeoPagePath({ postType: "use_case", slug: "ai-headshot" }),
    "/use-cases/ai-headshot",
  );
  assert.equal(
    buildSeoPagePath({ postType: "alternative", slug: "canva-alternative" }),
    "/alternatives/canva-alternative",
  );
  assert.equal(
    buildSeoPagePath({ postType: "compare", slug: "midjourney-vs-flux" }),
    "/compare/midjourney-vs-flux",
  );
});

test("builds locale-aware og image paths for seo pages", () => {
  assert.equal(
    buildSeoPageOgPath({
      postType: "use_case",
      slug: "ai-headshot",
      locale: "en",
    }),
    "/use-cases/ai-headshot/opengraph-image",
  );
  assert.equal(
    buildSeoPageOgPath({
      postType: "template",
      slug: "linkedin-prompt",
      locale: "zh",
    }),
    "/zh/templates/linkedin-prompt/opengraph-image",
  );
});

test("resolves only locales that have metadata for the seo page", async () => {
  const locales = await resolveSeoPageAvailableLocales(
    {
      postType: "template",
      slug: "professional-linkedin-headshot-prompt",
      locales: ["en", "zh", "ja"],
    },
    async ({ locale }) => ({
      metadata: locale === "ja" ? null : { title: locale, description: null, featuredImageUrl: null, visibility: "public" },
    }),
  );

  assert.deepEqual(locales, ["en", "zh"]);
});

test("builds related links with the correct route base for the page type", () => {
  const links = buildSeoPageRelatedLinks({
    postType: "alternative",
    currentSlug: "canva-alternative",
    posts: [
      {
        slug: "canva-alternative",
        title: "Current",
        description: "Current item",
        tags: null,
      },
      {
        slug: "figma-alternative",
        title: "Figma Alternative",
        description: "Another option",
        tags: "design,workflow",
      },
    ],
  });

  assert.deepEqual(links, [
    {
      href: "/alternatives/figma-alternative",
      title: "Figma Alternative",
      description: "Another option",
      tags: ["design", "workflow"],
    },
  ]);
});
