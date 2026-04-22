import assert from "node:assert/strict";
import test from "node:test";

import {
  seoContentSeedEntries,
  seoContentSeedSlugs,
} from "@/lib/db/seed/seo-content-data";
import {
  normalizeAlternativeMetadata,
  normalizeCompareMetadata,
  normalizeTemplateMetadata,
  normalizeUseCaseMetadata,
} from "@/lib/seo/content-schema";

test("seo content seed data covers seo pages and test blogs in en and zh", () => {
  assert.equal(seoContentSeedEntries.length, 10);

  const pairs = seoContentSeedEntries
    .map((entry) => `${entry.language}:${entry.postType}:${entry.slug}`)
    .sort();

  assert.deepEqual(pairs, [
    "en:alternative:canva-alternative-for-ai-headshots",
    "en:blog:ai-video-workflow-test-post",
    "en:compare:midjourney-vs-flux-for-marketing-images",
    "en:template:professional-linkedin-headshot-prompt",
    "en:use_case:ai-headshot-for-linkedin",
    "zh:alternative:canva-alternative-ai-headshots",
    "zh:blog:ai-video-workflow-test-post-zh",
    "zh:compare:midjourney-vs-flux-marketing-images",
    "zh:template:linkedin-professional-headshot-prompt",
    "zh:use_case:linkedin-ai-professional-headshot",
  ]);

  assert.deepEqual(seoContentSeedSlugs, {
    en: {
      blog: "ai-video-workflow-test-post",
      alternative: "canva-alternative-for-ai-headshots",
      compare: "midjourney-vs-flux-for-marketing-images",
      template: "professional-linkedin-headshot-prompt",
      useCase: "ai-headshot-for-linkedin",
    },
    zh: {
      blog: "ai-video-workflow-test-post-zh",
      alternative: "canva-alternative-ai-headshots",
      compare: "midjourney-vs-flux-marketing-images",
      template: "linkedin-professional-headshot-prompt",
      useCase: "linkedin-ai-professional-headshot",
    },
  });
});

test("seo content seed metadata matches current schema", () => {
  for (const entry of seoContentSeedEntries) {
    if (entry.postType === "blog") {
      assert.ok(entry.content.length > 0);
      assert.ok(entry.description.length > 0);
      continue;
    }

    if (entry.postType === "use_case") {
      const metadata = normalizeUseCaseMetadata(entry.metadataJsonb);
      assert.ok(metadata.benefits.length > 0);
      assert.ok(metadata.steps.length > 0);
      assert.ok(metadata.faqs.length > 0);
      continue;
    }

    if (entry.postType === "template") {
      const metadata = normalizeTemplateMetadata(entry.metadataJsonb);
      assert.ok(metadata.prompt.length > 0);
      assert.ok(metadata.variables.length > 0);
      assert.ok(metadata.tips.length > 0);
      assert.ok(metadata.faqs.length > 0);
      continue;
    }

    if (entry.postType === "alternative") {
      const metadata = normalizeAlternativeMetadata(entry.metadataJsonb);
      assert.ok(metadata.switchReasons.length > 0);
      assert.ok(metadata.advantages.length > 0);
      assert.ok(metadata.faqs.length > 0);
      continue;
    }

    const metadata = normalizeCompareMetadata(entry.metadataJsonb);
    assert.ok(metadata.comparisonRows.length > 0);
    assert.ok(metadata.recommendedScenarios.length > 0);
    assert.ok(metadata.faqs.length > 0);
  }
});
