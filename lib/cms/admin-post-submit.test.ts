import assert from "node:assert/strict";
import test from "node:test";

import { parseAdminPostSubmission } from "@/lib/cms/admin-post-submit";

function buildBasePayload(overrides: Record<string, unknown> = {}) {
  return {
    language: "en",
    title: "Test admin post",
    slug: "test-admin-post",
    content: "# Hello",
    description: "Test description",
    status: "published",
    visibility: "public",
    featuredImageUrl: "https://example.com/cover.jpg",
    ...overrides,
  };
}

test("accepts a blog payload", () => {
  const result = parseAdminPostSubmission(
    buildBasePayload({
      postType: "blog",
      metadataJsonb: { source: "api" },
    }),
  );

  assert.equal(result.success, true);
  if (!result.success) {
    return;
  }

  assert.equal(result.data.postType, "blog");
  assert.deepEqual(result.data.metadataJsonb, { source: "api" });
});

test("accepts a glossary payload", () => {
  const result = parseAdminPostSubmission(
    buildBasePayload({
      postType: "glossary",
      metadataJsonb: { glossaryGroup: "models" },
    }),
  );

  assert.equal(result.success, true);
  if (!result.success) {
    return;
  }

  assert.equal(result.data.postType, "glossary");
});

test("accepts use_case metadata and normalizes arrays", () => {
  const result = parseAdminPostSubmission(
    buildBasePayload({
      postType: "use_case",
      metadataJsonb: {
        heroSubtitle: "Scale creative output",
        benefits: [{ title: "Faster drafts" }],
      },
    }),
  );

  assert.equal(result.success, true);
  if (!result.success) {
    return;
  }

  assert.deepEqual(result.data.metadataJsonb, {
    heroSubtitle: "Scale creative output",
    targetAudience: null,
    problemSummary: null,
    benefits: [{ title: "Faster drafts", description: null }],
    steps: [],
    faqs: [],
    ctaLabel: null,
    ctaHref: null,
  });
});

test("rejects template payloads without prompt metadata", () => {
  const result = parseAdminPostSubmission(
    buildBasePayload({
      postType: "template",
      metadataJsonb: {
        variables: [],
      },
    }),
  );

  assert.deepEqual(result, {
    success: false,
    status: 400,
    message: "Invalid metadataJsonb for postType 'template'.",
  });
});

test("rejects compare payloads with malformed comparison rows", () => {
  const result = parseAdminPostSubmission(
    buildBasePayload({
      postType: "compare",
      metadataJsonb: {
        comparisonRows: [{ leftValue: "Fast", rightValue: "Slow" }],
      },
    }),
  );

  assert.deepEqual(result, {
    success: false,
    status: 400,
    message: "Invalid metadataJsonb for postType 'compare'.",
  });
});
