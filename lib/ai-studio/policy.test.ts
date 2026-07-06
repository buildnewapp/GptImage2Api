import assert from "node:assert/strict";
import test from "node:test";

import type { AiStudioCatalogEntry } from "@/lib/ai-studio/catalog";
import {
  canAccessAiStudioModel,
  filterAiStudioCatalogForRole,
} from "@/lib/ai-studio/policy";

function createEntry(
  overrides: Partial<AiStudioCatalogEntry> = {},
): AiStudioCatalogEntry {
  return {
    id: "video:sora2-text-to-video",
    category: "video",
    title: "Sora2 - Text to Video",
    docUrl: "https://docs.kie.ai/market/sora2/sora-2-text-to-video.md",
    provider: "Sora2",
    pricing: {
      price_key: "{$duration}",
      price_map: { "5": 30 },
      price_final: "{$price}",
    },
    ...overrides,
  };
}

test("filters blocked and non-whitelisted models from catalog", () => {
  const entries = [
    createEntry(),
    createEntry({
      id: "video:wan-text-to-video",
      title: "Wan - Text to Video",
    }),
  ];

  const filtered = filterAiStudioCatalogForRole(entries, {
    role: "user",
    config: {
      allowedModelIds: ["video:wan-text-to-video"],
      blockedModelIds: ["video:sora2-text-to-video"],
    },
  });

  assert.deepEqual(filtered.map((entry) => entry.id), ["video:wan-text-to-video"]);
});

test("hides unpriced models from non-admin users", () => {
  const entry = createEntry({
    id: "video:no-price-model",
    pricing: undefined,
  });

  assert.equal(
    canAccessAiStudioModel(entry, {
      role: "user",
      config: {
        allowedModelIds: [],
        blockedModelIds: [],
      },
    }),
    false,
  );

  assert.equal(
    canAccessAiStudioModel(entry, {
      role: "admin",
      config: {
        allowedModelIds: [],
        blockedModelIds: [],
      },
    }),
    true,
  );
});

test("allows explicitly whitelisted unpriced models for non-admin users", () => {
  const entry = createEntry({
    id: "video:bytedance-v1-pro-text-to-video",
    pricing: undefined,
  });

  assert.equal(
    canAccessAiStudioModel(entry, {
      role: "user",
      config: {
        allowedModelIds: ["video:bytedance-v1-pro-text-to-video"],
        blockedModelIds: [],
      },
    }),
    true,
  );
});
