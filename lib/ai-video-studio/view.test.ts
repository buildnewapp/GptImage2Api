import assert from "node:assert/strict";
import test from "node:test";

import {
  hasAiVideoStudioSignedInSession,
  shouldShowAiVideoStudioSignedInUi,
} from "@/lib/ai-video-studio/view";

test("detects a signed-in ai video studio session", () => {
  assert.equal(hasAiVideoStudioSignedInSession(undefined), false);
  assert.equal(hasAiVideoStudioSignedInSession(null), false);
  assert.equal(hasAiVideoStudioSignedInSession({}), false);
  assert.equal(hasAiVideoStudioSignedInSession({ user: null }), false);
  assert.equal(hasAiVideoStudioSignedInSession({ user: { id: "user_123" } }), true);
});

test("hides signed-in ui until hydration completes", () => {
  const session = { user: { id: "user_123" } };

  assert.equal(shouldShowAiVideoStudioSignedInUi(session, false), false);
  assert.equal(shouldShowAiVideoStudioSignedInUi(session, true), true);
});
