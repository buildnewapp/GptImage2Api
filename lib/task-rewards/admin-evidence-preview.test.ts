import assert from "node:assert/strict";
import test from "node:test";

import { shouldApplyAdminEvidencePreview } from "@/lib/task-rewards/admin-evidence-preview";

const applicationA = "123e4567-e89b-42d3-a456-426614174000";
const applicationB = "223e4567-e89b-42d3-a456-426614174000";

test("applies evidence only to the latest request for the currently selected application", () => {
  assert.equal(
    shouldApplyAdminEvidencePreview({
      requestToken: 2,
      currentToken: 2,
      requestedApplicationId: applicationB,
      currentApplicationId: applicationB,
      resultApplicationId: applicationB,
    }),
    true,
  );
});

test("ignores an older preview response after switching applications", () => {
  assert.equal(
    shouldApplyAdminEvidencePreview({
      requestToken: 1,
      currentToken: 2,
      requestedApplicationId: applicationA,
      currentApplicationId: applicationB,
      resultApplicationId: applicationA,
    }),
    false,
  );
});

test("ignores preview responses after the dialog closes", () => {
  assert.equal(
    shouldApplyAdminEvidencePreview({
      requestToken: 1,
      currentToken: 2,
      requestedApplicationId: applicationA,
      currentApplicationId: null,
      resultApplicationId: applicationA,
    }),
    false,
  );
});

test("ignores a response whose application id does not match the request", () => {
  assert.equal(
    shouldApplyAdminEvidencePreview({
      requestToken: 2,
      currentToken: 2,
      requestedApplicationId: applicationB,
      currentApplicationId: applicationB,
      resultApplicationId: applicationA,
    }),
    false,
  );
});
