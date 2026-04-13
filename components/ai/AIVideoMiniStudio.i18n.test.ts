import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = process.cwd();

test("mini studio reads hero form copy through Landing.Hero translations", () => {
  const source = readFileSync(
    path.join(projectRoot, "components/ai/AIVideoMiniStudio.tsx"),
    "utf8",
  );

  assert.match(source, /useTranslations\("Landing\.Hero"\)/);
  assert.match(source, /t\("form\.generationQueued"\)/);
  assert.match(source, /t\("form\.generationCompleted"\)/);
  assert.match(source, /t\("form\.replace"\)/);
  assert.match(source, /t\("form\.reference"\)/);
  assert.doesNotMatch(source, /getSeedancePricingExplanation/);
  assert.doesNotMatch(source, /pricingExplanation/);
});
