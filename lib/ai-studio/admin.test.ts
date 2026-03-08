import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAiStudioAdminSummary,
  canAdminMarkGenerationFailed,
  formatAdminFailureReason,
  matchesAiStudioAdminFilters,
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
