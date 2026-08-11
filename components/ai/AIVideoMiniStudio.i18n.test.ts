import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const projectRoot = process.cwd();

test("mini studio reads shared AI Studio form copy through common translations", () => {
  const source = readFileSync(
    path.join(projectRoot, "components/ai/AIVideoMiniStudio.tsx"),
    "utf8",
  );

  assert.match(source, /useTranslations\("AIVideoStudio"\)/);
  assert.match(source, /t\("form\.generationQueued"\)/);
  assert.match(source, /t\("form\.generationCompleted"\)/);
  assert.match(source, /t\("form\.replace"\)/);
  assert.match(source, /t\("form\.reference"\)/);
});

test("mini studio limits the homepage selector to featured models", () => {
  const source = readFileSync(
    path.join(projectRoot, "components/ai/AIVideoMiniStudio.tsx"),
    "utf8",
  );

  assert.match(
    source,
    /family\.selectable !== false &&\s*family\.versions\.some\(\(version\) => version\.isHot === true\)/,
  );
  assert.match(
    source,
    /activeFamilyVersions\.filter\(\s*\(version\) => version\.isHot === true,/,
  );
  assert.match(
    source,
    /onBrowseAllModels=\{\(\) => router\.push\("\/generator"\)\}/,
  );
  assert.doesNotMatch(source, /allModelsLabel/);
});
