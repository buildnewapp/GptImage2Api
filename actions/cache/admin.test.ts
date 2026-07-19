import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const actionSource = readFileSync(
  new URL("./admin.ts", import.meta.url),
  "utf8",
);

const clientSource = readFileSync(
  new URL(
    "../../app/[locale]/(protected)/dashboard/(admin)/config/ConfigAdminClient.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("cache cleanup action is admin-only and clears frontend caches", () => {
  assert.match(actionSource, /await isAdmin\(\)/);
  assert.match(actionSource, /revalidatePath\("\/", "layout"\)/);

  for (const tag of [
    "partner-snippets",
    "public-pricing-plans",
    "public-showcase-generations",
    "public-prompt-gallery-stats",
  ]) {
    assert.match(actionSource, new RegExp(`updateTag\\("${tag}"\\)`));
  }
});

test("config page exposes cache management action", () => {
  assert.match(clientSource, /clearFrontendCacheAction/);
  assert.match(clientSource, /缓存管理/);
  assert.match(clientSource, /清理全部前台缓存/);
});
