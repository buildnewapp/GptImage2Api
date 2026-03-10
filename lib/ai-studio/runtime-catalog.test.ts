import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type {
  AiStudioDocDetail,
  AiStudioPricingRow,
} from "@/lib/ai-studio/catalog";
import {
  compileAiStudioRuntimeCatalog,
  loadAiStudioRuntimeCatalogFile,
  toAiStudioCatalogEntries,
  validateAiStudioRuntimeBuildInput,
} from "@/lib/ai-studio/catalog";

function createPricingRow(
  overrides: Partial<AiStudioPricingRow> = {},
): AiStudioPricingRow {
  return {
    modelDescription: "Open AI sora 2, text-to-video, Standard-10.0s",
    interfaceType: "video",
    provider: "OpenAI",
    creditPrice: "30",
    creditUnit: "per video",
    usdPrice: "0.15",
    falPrice: "1",
    discountRate: 85,
    anchor: "https://kie.ai/sora-2?model=sora-2-text-to-video",
    discountPrice: false,
    ...overrides,
  };
}

function createDetail(
  overrides: Partial<AiStudioDocDetail> = {},
): AiStudioDocDetail {
  return {
    id: "video:sora2-text-to-video",
    category: "video",
    title: "Sora2 - Text to Video",
    docUrl: "https://docs.kie.ai/market/sora2/sora-2-text-to-video.md",
    provider: "Sora2",
    endpoint: "/api/v1/jobs/createTask",
    method: "POST",
    modelKeys: ["sora-2-text-to-video"],
    requestSchema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          default: "sora-2-text-to-video",
        },
      },
    },
    examplePayload: {
      model: "sora-2-text-to-video",
    },
    pricingRows: [createPricingRow()],
    ...overrides,
  };
}

test("compiles runtime catalog with model and pricing overrides", () => {
  const compiled = compileAiStudioRuntimeCatalog({
    upstream: {
      version: 1,
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [createDetail()],
    },
    modelOverrides: {
      models: {
        "video:sora2-text-to-video": {
          alias: "Sora 2",
          provider: "OpenAI",
        },
      },
    },
    pricingOverrides: {
      models: {
        "video:sora2-text-to-video": {
          rows: [
            {
              match: {
                runtimeModel: "sora-2-text-to-video",
              },
              creditPrice: "42",
            },
          ],
        },
      },
    },
  });

  assert.equal(compiled.items[0]?.alias, "Sora 2");
  assert.equal(compiled.items[0]?.provider, "OpenAI");
  assert.equal(compiled.items[0]?.pricingRows[0]?.creditPrice, "42");
});

test("drops disabled models from the compiled runtime catalog", () => {
  const compiled = compileAiStudioRuntimeCatalog({
    upstream: {
      version: 1,
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [createDetail()],
    },
    modelOverrides: {
      models: {
        "video:sora2-text-to-video": {
          enabled: false,
        },
      },
    },
    pricingOverrides: {
      models: {},
    },
  });

  assert.equal(compiled.items.length, 0);
  assert.equal(toAiStudioCatalogEntries(compiled).length, 0);
});

test("loads a local runtime catalog file for runtime reads", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "ai-studio-runtime-"));
  const runtimePath = path.join(tempDir, "catalog.json");

  try {
    await writeFile(
      runtimePath,
      JSON.stringify({
        version: 1,
        generatedAt: "2026-03-08T00:00:00.000Z",
        items: [
          {
            ...createDetail({
              provider: "OpenAI",
            }),
            alias: "Sora 2",
          },
        ],
      }),
      "utf8",
    );

    const loaded = await loadAiStudioRuntimeCatalogFile(runtimePath);
    assert.equal(loaded.items[0]?.alias, "Sora 2");
    assert.equal(toAiStudioCatalogEntries(loaded)[0]?.provider, "OpenAI");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("splits one upstream model into separate runtime variants", () => {
  const compiled = compileAiStudioRuntimeCatalog({
    upstream: {
      version: 1,
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [
        createDetail({
          pricingRows: [
            createPricingRow({
              modelDescription: "Open AI sora 2, text-to-video, Standard-10.0s",
              creditPrice: "30",
              anchor: "https://kie.ai/sora-2?model=sora-2-text-to-video",
            }),
            createPricingRow({
              modelDescription: "Open AI sora 2, text-to-video, stable-10.0s",
              creditPrice: "35",
              anchor: "https://kie.ai/sora-2?model=sora-2-text-to-video-stable",
            }),
          ],
        }),
      ],
    },
    modelOverrides: {
      models: {
        "video:sora2-text-to-video": {
          splitModels: [
            {
              id: "video:sora2-text-to-video-standard",
              title: "Sora2 - Text to Video",
              schemaModel: "sora-2-text-to-video",
              pricingMatch: {
                runtimeModel: "sora-2-text-to-video",
              },
            },
            {
              id: "video:sora2-text-to-video-stable",
              title: "Sora2 - Text to Video Stable",
              schemaModel: "sora-2-text-to-video-stable",
              pricingMatch: {
                runtimeModel: "sora-2-text-to-video-stable",
              },
            },
          ],
        },
      },
    },
    pricingOverrides: {
      models: {},
    },
  });

  assert.equal(compiled.items.length, 2);

  const standard = compiled.items.find(
    (item) => item.id === "video:sora2-text-to-video-standard",
  );
  const stable = compiled.items.find(
    (item) => item.id === "video:sora2-text-to-video-stable",
  );

  assert.equal(standard?.alias ?? null, null);
  assert.equal(standard?.title, "Sora2 - Text to Video");
  assert.equal(standard?.modelKeys[0], "sora-2-text-to-video");
  assert.equal(standard?.examplePayload.model, "sora-2-text-to-video");
  assert.equal(
    (standard?.requestSchema as Record<string, any>).properties.model.default,
    "sora-2-text-to-video",
  );
  assert.equal(standard?.pricingRows.length, 1);
  assert.match(standard?.pricingRows[0]?.modelDescription ?? "", /standard/i);

  assert.equal(stable?.alias ?? null, null);
  assert.equal(stable?.title, "Sora2 - Text to Video Stable");
  assert.equal(stable?.modelKeys[0], "sora-2-text-to-video-stable");
  assert.equal(stable?.examplePayload.model, "sora-2-text-to-video-stable");
  assert.equal(
    (stable?.requestSchema as Record<string, any>).properties.model.default,
    "sora-2-text-to-video-stable",
  );
  assert.equal(stable?.pricingRows.length, 1);
  assert.match(stable?.pricingRows[0]?.modelDescription ?? "", /stable/i);
});

test("validates pricing overrides against the correct split model entry", () => {
  const errors = validateAiStudioRuntimeBuildInput({
    upstream: {
      version: 1,
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [
        createDetail({
          pricingRows: [
            createPricingRow({
              modelDescription: "Open AI sora 2, text-to-video, Standard-10.0s",
              creditPrice: "30",
              anchor: "https://kie.ai/sora-2?model=sora-2-text-to-video",
            }),
            createPricingRow({
              modelDescription: "Open AI sora 2, text-to-video, stable-10.0s",
              creditPrice: "35",
              anchor: "https://kie.ai/sora-2?model=sora-2-text-to-video-stable",
            }),
          ],
        }),
      ],
    },
    modelOverrides: {
      models: {
        "video:sora2-text-to-video": {
          splitModels: [
            {
              id: "video:sora2-text-to-video-standard",
              title: "Sora2 - Text to Video",
              schemaModel: "sora-2-text-to-video",
              pricingMatch: {
                runtimeModel: "sora-2-text-to-video",
              },
            },
            {
              id: "video:sora2-text-to-video-stable",
              title: "Sora2 - Text to Video Stable",
              schemaModel: "sora-2-text-to-video-stable",
              pricingMatch: {
                runtimeModel: "sora-2-text-to-video-stable",
              },
            },
          ],
        },
      },
    },
    pricingOverrides: {
      models: {
        "video:sora2-text-to-video-stable": {
          rows: [
            {
              match: {
                runtimeModel: "sora-2-text-to-video-stable",
                modelDescriptionIncludes: "stable-10.0s",
              },
              creditPrice: "70",
            },
          ],
        },
      },
    },
  });

  assert.deepEqual(errors, []);
});

test("allows pricing overrides to append rows for models without upstream pricing", () => {
  const input = {
    upstream: {
      version: 1,
      generatedAt: "2026-03-10T00:00:00.000Z",
      items: [
        createDetail({
          id: "video:bytedance-v1-pro-text-to-video",
          title: "Bytedance - V1 Pro Text to Video",
          docUrl: "https://docs.kie.ai/market/bytedance/v1-pro-text-to-video.md",
          provider: "Bytedance",
          modelKeys: ["bytedance/v1-pro-text-to-video"],
          requestSchema: {
            type: "object",
            properties: {
              model: {
                type: "string",
                default: "bytedance/v1-pro-text-to-video",
              },
            },
          },
          examplePayload: {
            model: "bytedance/v1-pro-text-to-video",
          },
          pricingRows: [],
        }),
      ],
    },
    modelOverrides: {
      models: {},
    },
    pricingOverrides: {
      models: {
        "video:bytedance-v1-pro-text-to-video": {
          addRows: [
            {
              modelDescription: "Seedance 1.5, text-to-video, 720p, 5s",
              interfaceType: "video",
              provider: "ByteDance",
              creditPrice: "30",
              creditUnit: "per video",
              usdPrice: "",
              falPrice: "",
              discountRate: 0,
              anchor: "https://kie.ai/seedance-1-5?model=bytedance%2Fv1-pro-text-to-video",
              discountPrice: false,
            },
          ],
        },
      },
    },
  } satisfies Parameters<typeof compileAiStudioRuntimeCatalog>[0];

  assert.deepEqual(validateAiStudioRuntimeBuildInput(input), []);

  const compiled = compileAiStudioRuntimeCatalog(input);
  assert.equal(compiled.items[0]?.pricingRows.length, 1);
  assert.equal(compiled.items[0]?.pricingRows[0]?.creditPrice, "30");
  assert.equal(compiled.items[0]?.pricingRows[0]?.provider, "ByteDance");
});
