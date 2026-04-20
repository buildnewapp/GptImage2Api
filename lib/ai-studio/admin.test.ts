import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_AI_STUDIO_EDITABLE_CATEGORIES,
  buildAiStudioAdminSummary,
  canAdminMarkGenerationFailed,
  formatAdminFailureReason,
  matchesAiStudioAdminFilters,
  parseAdminAiStudioGenerationEditInput,
  type AiStudioAdminRow,
} from "@/lib/ai-studio/admin";

const rows: AiStudioAdminRow[] = [
  {
    id: "g1",
    userEmail: "alice@example.com",
    userName: "Alice",
    category: "video",
    title: "Sora2 - Text to Video",
    provider: "Sora2",
    status: "queued",
    reservedCredits: 40,
    refundedCredits: 0,
    createdAt: "2026-03-08T10:00:00.000Z",
  },
  {
    id: "g2",
    userEmail: "bob@example.com",
    userName: "Bob",
    category: "image",
    title: "Nano Banana 2",
    provider: "Google",
    status: "failed",
    reservedCredits: 18,
    refundedCredits: 18,
    createdAt: "2026-03-08T11:00:00.000Z",
  },
  {
    id: "g3",
    userEmail: "carol@example.com",
    userName: "Carol",
    category: "video",
    title: "Runway Aleph",
    provider: "Runway",
    status: "succeeded",
    reservedCredits: 60,
    refundedCredits: 0,
    createdAt: "2026-03-08T12:00:00.000Z",
  },
];

test("builds admin summary totals from generation rows", () => {
  const summary = buildAiStudioAdminSummary(rows);

  assert.equal(summary.total, 3);
  assert.equal(summary.active, 1);
  assert.equal(summary.succeeded, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.reservedCredits, 118);
  assert.equal(summary.refundedCredits, 18);
});

test("matches admin filters by status, category, and search text", () => {
  assert.equal(
    matchesAiStudioAdminFilters(rows[0]!, {
      status: "queued",
      category: "video",
      search: "alice",
    }),
    true,
  );

  assert.equal(
    matchesAiStudioAdminFilters(rows[1]!, {
      status: "succeeded",
    }),
    false,
  );

  assert.equal(
    matchesAiStudioAdminFilters(rows[2]!, {
      category: "music",
    }),
    false,
  );
});

test("allows admin to mark any non-failed generation as failed", () => {
  assert.equal(canAdminMarkGenerationFailed("queued"), true);
  assert.equal(canAdminMarkGenerationFailed("succeeded"), true);
  assert.equal(canAdminMarkGenerationFailed("failed"), false);
});

test("formats admin failure reasons consistently", () => {
  assert.equal(
    formatAdminFailureReason("provider returned invalid character_id"),
    "Marked failed by admin: provider returned invalid character_id",
  );
  assert.equal(
    formatAdminFailureReason(undefined, "Provider task failed"),
    "Marked failed by admin: Provider task failed",
  );
  assert.equal(formatAdminFailureReason(), "Marked failed by admin.");
});

test("parses editable admin generation fields into normalized values", () => {
  const parsed = parseAdminAiStudioGenerationEditInput({
    generationId: "322bb0d1-f307-4400-a65e-0df36ceff5de",
    catalogModelId: " image:gpt-image-1 ",
    category: "image",
    resultUrlsText: "https://example.com/1.png\n\n https://example.com/2.png ",
    isPublic: true,
    userDeletedAt: "",
    completedAt: "2026-04-20T18:30",
  });

  assert.deepEqual(parsed, {
    generationId: "322bb0d1-f307-4400-a65e-0df36ceff5de",
    catalogModelId: "image:gpt-image-1",
    category: "image",
    resultUrls: ["https://example.com/1.png", "https://example.com/2.png"],
    isPublic: true,
    userDeletedAt: null,
    completedAt: new Date("2026-04-20T18:30").toISOString(),
  });
});

test("rejects invalid admin generation edit input", () => {
  assert.throws(
    () =>
      parseAdminAiStudioGenerationEditInput({
        generationId: "322bb0d1-f307-4400-a65e-0df36ceff5de",
        catalogModelId: "video:model",
        category: "invalid-category",
        resultUrlsText: "notaurl",
        isPublic: false,
        userDeletedAt: "bad-date",
        completedAt: "",
      }),
    /category|url|date/i,
  );
});

test("exports the supported editable admin categories", () => {
  assert.deepEqual(ADMIN_AI_STUDIO_EDITABLE_CATEGORIES, [
    "video",
    "image",
    "music",
    "chat",
  ]);
});
