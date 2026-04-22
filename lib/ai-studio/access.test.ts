import assert from "node:assert/strict";
import test from "node:test";

import { getAiDemoAccessRedirect } from "@/lib/ai-studio/access";

test("allows admin users to access ai demo pages", () => {
  assert.equal(getAiDemoAccessRedirect(true), null);
});

test("redirects non-admin users away from ai demo pages", () => {
  assert.equal(getAiDemoAccessRedirect(false), "/403");
});
