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

test("mini studio lets users browse non-selectable family versions without selecting them", () => {
  const source = readFileSync(
    path.join(projectRoot, "components/ai/AIVideoMiniStudio.tsx"),
    "utf8",
  );

  assert.match(
    source,
    /AI_VIDEO_STUDIO_FAMILIES\s*\.map\(\(family\) => \(\{/,
  );
  assert.equal(
    source.match(/aria-disabled=\{model\.selectable === false\}/g)?.length,
    4,
  );
  assert.equal(
    source.match(/activeModel\?\.selectable !== false/g)?.length,
    1,
  );
  assert.equal(
    source.match(/disabled=\{!isActiveFamilySelectable\}/g)?.length,
    2,
  );
  assert.equal(
    source.match(/if \(!isActiveFamilySelectable\) \{/g)?.length,
    2,
  );
  assert.equal(
    source.match(
      /model\.selectable === false && "flex-col items-start gap-1"/g,
    )?.length,
    4,
  );
  assert.doesNotMatch(source, /const versionName =/);
  assert.doesNotMatch(source, /Version ·/);
});
