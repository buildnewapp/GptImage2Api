import assert from "node:assert/strict";
import test from "node:test";

import type { AiStudioPublicCatalogEntry } from "@/lib/ai-studio/public";
import { matchesCatalogSearch } from "@/lib/ai-studio/search";

const entry: AiStudioPublicCatalogEntry = {
  id: "video:grok-imagine-image-to-video",
  category: "video",
  title: "Grok Imagine Image to Video",
  provider: "Grok Imagine",
};

test("matches model catalog search by model title, id, and provider only", () => {
  assert.equal(matchesCatalogSearch(entry, "grok imagine"), true);
  assert.equal(matchesCatalogSearch(entry, "image-to-video"), true);
  assert.equal(matchesCatalogSearch(entry, "video:grok-imagine-image-to-video"), true);
  assert.equal(matchesCatalogSearch(entry, "10s 720p"), false);
});
