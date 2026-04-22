import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

import type {
  AiStudioDocDetail,
  AiStudioPricingRow,
} from "@/lib/ai-studio/catalog";
import type { AiStudioStructuredKiePriceRow } from "@/lib/ai-studio/kie-pricing";
import {
  buildAiStudioUpstreamCatalog,
  buildAiStudioKiePricesFile,
  compileAiStudioRuntimeCatalog,
  getAiStudioCatalogPaths,
  getCachedAiStudioCatalogEntry,
  loadAiStudioMergedUpstreamCatalogFiles,
  loadAiStudioRuntimeCatalogFile,
  toAiStudioCatalogEntries,
  validateAiStudioRuntimeBuildInput,
} from "@/lib/ai-studio/catalog";

const execFile = promisify(execFileCallback);

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

function createKiePricingRow(
  overrides: Partial<AiStudioStructuredKiePriceRow> & Pick<AiStudioStructuredKiePriceRow, "pricingKey">,
): AiStudioStructuredKiePriceRow {
  const { pricingKey, ...rest } = overrides;

  return {
    ...createPricingRow(),
    pricingKey,
    source: "kie",
    ...rest,
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
    pricingRows: [],
    ...overrides,
  };
}

test("builds upstream catalog without embedding pricing rows", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);

    if (url === "https://docs.kie.ai/llms.txt") {
      return new Response(
        "- Video Models > Sora2 [Sora2 - Text to Video](https://docs.kie.ai/market/sora2/sora-2-text-to-video.md): sample\n",
        { status: 200 },
      );
    }

    if (url === "https://docs.kie.ai/market/sora2/sora-2-text-to-video.md") {
      return new Response(
        [
          "# Sora2 - Text to Video",
          "",
          "```yaml",
          "openapi: 3.0.0",
          "paths:",
          "  /api/v1/jobs/createTask:",
          "    post:",
          "      requestBody:",
          "        content:",
          "          application/json:",
          "            schema:",
          "              type: object",
          "              properties:",
          "                model:",
          "                  type: string",
          "                  default: sora-2-text-to-video",
          "```",
          "",
        ].join("\n"),
        { status: 200 },
      );
    }

    if (url === "https://api.kie.ai/client/v1/model-pricing/count") {
      return Response.json({ data: { all: 1 } }, { status: 200 });
    }

    if (url === "https://api.kie.ai/client/v1/model-pricing/page") {
      return Response.json(
        {
          data: {
            records: [
              createPricingRow({
                runtimeModel: "sora-2-text-to-video",
                pricingKey: "Market_SORA2-VIDEO_NO-WATERMARK_10",
              }),
            ],
          },
        },
        { status: 200 },
      );
    }

    throw new Error(`Unexpected fetch url: ${url}`);
  }) as typeof globalThis.fetch;

  try {
    const upstream = await buildAiStudioUpstreamCatalog();
    assert.equal(upstream.items.length, 1);
    assert.deepEqual(upstream.items[0]?.pricingRows, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not hydrate runtime pricing rows from kie data", () => {
  const compiled = compileAiStudioRuntimeCatalog({
    upstream: {
      version: 1,
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [createDetail()],
    },
    kiePrices: {
      version: 1,
      generatedAt: "2026-03-08T00:00:00.000Z",
      rows: [
        {
          ...createPricingRow({
            pricingKey: "Market_SORA2-VIDEO_NO-WATERMARK_10",
            runtimeModel: "sora-2-text-to-video",
            duration: 10,
            source: "kie",
          }),
          pricingKey: "Market_SORA2-VIDEO_NO-WATERMARK_10",
          source: "kie",
        },
      ],
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
      models: {},
    },
    formUiOverrides: {
      models: {
        "video:sora2-text-to-video": {
          fieldOrder: ["prompt", "duration"],
          advancedFields: ["duration"],
        },
      },
    },
  });

  assert.equal(compiled.items[0]?.alias, "Sora 2");
  assert.equal(compiled.items[0]?.provider, "OpenAI");
  assert.deepEqual(compiled.items[0]?.pricingRows, []);
  assert.deepEqual(compiled.items[0]?.formUi, {
    fieldOrder: ["prompt", "duration"],
    advancedFields: ["duration"],
  });
});

test("normalizes sora image pricing from kie raw prices to the current display pricing system", async () => {
  const { kieRawPricePath } = getAiStudioCatalogPaths();
  const kiePrices = await buildAiStudioKiePricesFile(kieRawPricePath);

  const soraImage = kiePrices.rows.filter(
    (row) => row.catalogModelId === "video:sora2-image-to-video-standard",
  );
  const soraImageStable = kiePrices.rows.filter(
    (row) => row.catalogModelId === "video:sora2-image-to-video-stable",
  );
  const soraProImage = kiePrices.rows.filter(
    (row) => row.catalogModelId === "video:sora2-pro-image-to-video",
  );

  assert.deepEqual(
    soraImage.map((row) => [row.pricingKey, row.creditPrice]).sort(),
    [
      ["Market_sora2-remix_NO-WATERMARK_sora2_10", "3"],
      ["Market_sora2-remix_NO-WATERMARK_sora2_15", "5"],
    ],
  );
  assert.deepEqual(
    soraImageStable.map((row) => [row.pricingKey, row.creditPrice]).sort(),
    [
      ["Market_sora2-remix_WATERMARK_sora2_10", "20"],
      ["Market_sora2-remix_WATERMARK_sora2_15", "30"],
    ],
  );
  assert.deepEqual(
    soraProImage.map((row) => [row.pricingKey, row.creditPrice]).sort(),
    [
      ["Market_sora2-remix_sora2pro_high_10", "165"],
      ["Market_sora2-remix_sora2pro_high_15", "315"],
      ["Market_sora2-remix_sora2pro_standard_10", "75"],
      ["Market_sora2-remix_sora2pro_standard_15", "135"],
    ],
  );
});

test("generates pricing selectors from pricing override rows", () => {
  const compiled = compileAiStudioRuntimeCatalog({
    upstream: {
      version: 1,
      generatedAt: "2026-04-17T00:00:00.000Z",
      items: [
        createDetail({
          id: "video:sora2-pro-text-to-video",
          title: "Sora2 - Pro Text to Video",
          docUrl: "https://docs.kie.ai/market/sora2/sora-2-pro-text-to-video.md",
          provider: "OpenAI",
          modelKeys: ["sora-2-pro-text-to-video"],
          requestSchema: {
            type: "object",
            properties: {
              model: {
                type: "string",
                default: "sora-2-pro-text-to-video",
              },
              input: {
                type: "object",
                properties: {
                  prompt: {
                    type: "string",
                  },
                  aspect_ratio: {
                    type: "string",
                    enum: ["16:9", "9:16"],
                  },
                  n_frames: {
                    type: "string",
                    enum: ["10", "15"],
                  },
                  size: {
                    type: "string",
                    enum: ["standard", "high"],
                  },
                },
              },
            },
          },
          examplePayload: {
            model: "sora-2-pro-text-to-video",
            input: {
              prompt: "A neon alley",
              aspect_ratio: "16:9",
              n_frames: "10",
              size: "standard",
            },
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
        "video:sora2-pro-text-to-video": {
          addRows: [
            createPricingRow({
              modelDescription: "sora-2-pro-text-to-video, high, 10s",
              pricingKey: "Market_sora2_pro_high_10",
              runtimeModel: "sora-2-pro-text-to-video",
              resolution: "high",
              duration: 10,
              aspectRatio: "16:9",
            }),
            createPricingRow({
              modelDescription: "sora-2-pro-text-to-video, standard, 15s",
              pricingKey: "Market_sora2_pro_standard_15",
              runtimeModel: "sora-2-pro-text-to-video",
              resolution: "standard",
              duration: 15,
              aspectRatio: "9:16",
            }),
          ],
        },
      },
    },
  });

  assert.deepEqual(compiled.items[0]?.pricing, {
    strategy: "exact",
    selectors: {
      resolution: ["input.size"],
      duration: ["input.n_frames"],
      aspectRatio: ["input.aspect_ratio"],
    },
  });
});

test("applies request schema overrides to runtime models", () => {
  const compiled = (compileAiStudioRuntimeCatalog as any)({
    upstream: {
      version: 1,
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [
        createDetail({
          id: "video:bytedance-seedance-2",
          requestSchema: {
            type: "object",
            properties: {
              input: {
                type: "object",
                properties: {
                  duration: {
                    type: "integer",
                    description: "Video duration in 4-15 seconds.",
                    default: 5,
                  },
                },
              },
            },
          },
        }),
      ],
    },
    modelOverrides: {
      models: {},
    },
    pricingOverrides: {
      models: {},
    },
    schemaOverrides: {
      models: {
        "video:bytedance-seedance-2": {
          set: {
            "properties.input.properties.duration.minimum": 4,
            "properties.input.properties.duration.maximum": 15,
          },
        },
      },
    },
  });

  assert.equal(
    compiled.items[0]?.requestSchema?.properties?.input?.properties?.duration?.minimum,
    4,
  );
  assert.equal(
    compiled.items[0]?.requestSchema?.properties?.input?.properties?.duration?.maximum,
    15,
  );
});

test("hydrates missing request schema for direct models via overrides", () => {
  const compiled = compileAiStudioRuntimeCatalog({
    upstream: {
      version: 1,
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [
        createDetail({
          id: "video:kling-3-0",
          title: "Kling 3.0",
          docUrl: "https://docs.kie.ai/market/kling/kling-3-0.md",
          provider: "Kling 3.0",
          modelKeys: ["api"],
          requestSchema: null,
          examplePayload: {},
          pricingRows: [
            createPricingRow({
              modelDescription: "Kling 3.0, video, with audio-1080P",
              provider: "Kling",
            }),
          ],
        }),
      ],
    },
    modelOverrides: {
      models: {
        "video:kling-3-0": {
          schemaModel: "kling-3.0",
        },
      },
    },
    pricingOverrides: {
      models: {},
    },
    schemaOverrides: {
      models: {
        "video:kling-3-0": {
          replace: {
            type: "object",
            properties: {
              model: {
                type: "string",
              },
              input: {
                type: "object",
                properties: {
                  prompt: {
                    type: "string",
                  },
                  duration: {
                    type: "string",
                  },
                },
                required: ["prompt"],
              },
            },
          },
        },
      },
    },
  });

  assert.equal(compiled.items[0]?.modelKeys[0], "kling-3.0");
  assert.equal(compiled.items[0]?.examplePayload.model, "kling-3.0");
  assert.equal(compiled.items[0]?.requestSchema?.properties?.model?.type, "string");
  assert.equal(
    compiled.items[0]?.requestSchema?.properties?.input?.properties?.prompt?.type,
    "string",
  );
});

test("infers enable_pro as a boolean pricing selector for grok imagine image pricing", () => {
  const compiled = compileAiStudioRuntimeCatalog({
    upstream: {
      version: 1,
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [
        createDetail({
          id: "image:grok-imagine-text-to-image",
          category: "image",
          title: "Grok Imagine - Text to Image",
          docUrl: "https://docs.kie.ai/market/grok-imagine/text-to-image.md",
          provider: "Grok Imagine",
          modelKeys: ["grok-imagine/text-to-image"],
          requestSchema: {
            type: "object",
            properties: {
              model: {
                type: "string",
                default: "grok-imagine/text-to-image",
              },
              input: {
                type: "object",
                properties: {
                  enable_pro: {
                    type: "boolean",
                  },
                },
              },
            },
          },
          examplePayload: {
            model: "grok-imagine/text-to-image",
            input: {
              enable_pro: false,
            },
          },
        }),
      ],
    },
    modelOverrides: {
      models: {},
    },
    pricingOverrides: {
      models: {
        "image:grok-imagine-text-to-image": {
          addRows: [
            createPricingRow({
              interfaceType: "image",
              provider: "Grok Imagine",
              runtimeModel: "grok-imagine/text-to-image",
              modelDescription: "grok-imagine/text-to-image, standard",
              creditPrice: "4",
              creditUnit: "per generation",
              audio: false,
            }),
            createPricingRow({
              interfaceType: "image",
              provider: "Grok Imagine",
              runtimeModel: "grok-imagine/text-to-image",
              modelDescription: "grok-imagine/text-to-image, quality",
              creditPrice: "5",
              creditUnit: "per generation",
              audio: true,
            }),
          ],
        },
      },
    },
  });

  assert.deepEqual(compiled.items[0]?.pricing, {
    strategy: "exact",
    selectors: {
      audio: ["input.enable_pro"],
    },
  });
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
    formUiOverrides: {
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

test("merges multiple upstream catalog files from the same directory", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "ai-studio-upstream-merge-"));
  const primaryPath = path.join(tempDir, "catalog.json");
  const apimartPath = path.join(tempDir, "apimart.json");

  try {
    await writeFile(
      primaryPath,
      JSON.stringify({
        version: 1,
        generatedAt: "2026-03-08T00:00:00.000Z",
        items: [createDetail()],
      }),
      "utf8",
    );
    await writeFile(
      apimartPath,
      JSON.stringify({
        version: 1,
        generatedAt: "2026-03-08T00:00:00.000Z",
        items: [
          createDetail({
            id: "video:apimart-seedance-2-0",
            vendor: "apimart",
            title: "Seedance 2.0",
            docUrl: "https://docs.apimart.ai/en/api-reference/videos/doubao-seedance-2-0/generation",
            provider: "ByteDance",
            endpoint: "/v1/videos/generations",
            statusEndpoint: "/v1/tasks/{taskId}?language=en",
            modelKeys: ["doubao-seedance-2.0"],
            examplePayload: {
              model: "doubao-seedance-2.0",
            },
          }),
        ],
      }),
      "utf8",
    );

    const loaded = await loadAiStudioMergedUpstreamCatalogFiles(primaryPath);

    assert.deepEqual(
      loaded.items.map((item) => item.id),
      ["video:sora2-text-to-video", "video:apimart-seedance-2-0"],
    );
    assert.equal(loaded.items[1]?.vendor, "apimart");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("loads apimart sora 2 models from the real upstream catalog", async () => {
  const { upstreamCatalogPath } = getAiStudioCatalogPaths();
  const loaded = await loadAiStudioMergedUpstreamCatalogFiles(upstreamCatalogPath);

  const sora2Pro = loaded.items.find((item) => item.id === "video:apimart-sora-2-pro");
  const sora2Vip = loaded.items.find((item) => item.id === "video:apimart-sora-2-vip");
  const sora2Preview = loaded.items.find(
    (item) => item.id === "video:apimart-sora-2-preview",
  );
  const sora2ProPreview = loaded.items.find(
    (item) => item.id === "video:apimart-sora-2-pro-preview",
  );

  assert.ok(sora2Pro);
  assert.ok(sora2Vip);
  assert.ok(sora2Preview);
  assert.ok(sora2ProPreview);
  assert.deepEqual(sora2Pro.modelKeys, ["sora-2-pro"]);
  assert.deepEqual(sora2Vip.modelKeys, ["sora-2-vip"]);
  assert.deepEqual(sora2Preview.modelKeys, ["sora-2-preview"]);
  assert.deepEqual(sora2ProPreview.modelKeys, ["sora-2-pro-preview"]);
  assert.equal(sora2Pro.requestSchema?.properties?.storyboard?.type, "boolean");
  assert.equal(
    sora2Vip.requestSchema?.properties?.storyboard,
    undefined,
  );
  assert.equal(
    sora2Vip.requestSchema?.properties?.watermark,
    undefined,
  );
  assert.equal(
    sora2Pro.requestSchema?.properties?.character_timestamps?.type,
    "string",
  );
  assert.equal(
    sora2Preview.requestSchema?.properties?.resolution,
    undefined,
  );
  assert.deepEqual(
    sora2ProPreview.requestSchema?.properties?.resolution?.enum,
    ["standard", "high"],
  );
});

test("keeps runtime catalog paths rooted at cwd config dir", async () => {
  const originalCwd = process.cwd();
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "ai-studio-bundle-"));
  const bundleDir = path.join(tempDir, "bundle");
  const bundledRuntimePath = path.join(
    bundleDir,
    "server-functions",
    "default",
    "config",
    "ai-studio",
    "runtime",
    "catalog.json",
  );

  try {
    await mkdir(path.dirname(bundledRuntimePath), { recursive: true });
    await writeFile(
      bundledRuntimePath,
      JSON.stringify({
        version: 1,
        generatedAt: "2026-03-08T00:00:00.000Z",
        items: [],
      }),
      "utf8",
    );

    const moduleUrl = pathToFileURL(
      path.join(originalCwd, "lib/ai-studio/catalog.ts"),
    ).href;
    const script = [
      `process.chdir(${JSON.stringify(bundleDir)});`,
      `const mod = await import(${JSON.stringify(moduleUrl)});`,
      "process.stdout.write(JSON.stringify(mod.default.getAiStudioCatalogPaths()));",
    ].join("\n");
    const { stdout } = await execFile(
      process.execPath,
      ["--import", "tsx", "-e", script],
      {
        cwd: originalCwd,
      },
    );
    const paths = JSON.parse(stdout) as {
      runtimeCatalogPath: string;
    };

    assert.equal(
      paths.runtimeCatalogPath.endsWith(
        "/bundle/config/ai-studio/runtime/catalog.json",
      ),
      true,
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("uses the bundled runtime catalog by default in a Cloudflare worker cwd", async () => {
  const originalCwd = process.cwd();
  const originalPlatform = process.env.DEPLOYMENT_PLATFORM;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "ai-studio-cf-runtime-"));
  const bundleDir = path.join(tempDir, "bundle");

  try {
    await mkdir(bundleDir, { recursive: true });
    process.env.DEPLOYMENT_PLATFORM = "cloudflare";

    const moduleUrl = pathToFileURL(
      path.join(originalCwd, "lib/ai-studio/catalog.ts"),
    ).href;
    const script = [
      `process.chdir(${JSON.stringify(bundleDir)});`,
      "process.env.DEPLOYMENT_PLATFORM = 'cloudflare';",
      `const mod = await import(${JSON.stringify(moduleUrl)});`,
      "const entry = await mod.default.getCachedAiStudioCatalogEntry('video:sora2-text-to-video-standard');",
      "process.stdout.write(JSON.stringify({ found: Boolean(entry), id: entry?.id ?? null }));",
    ].join("\n");
    const { stdout } = await execFile(
      process.execPath,
      ["--import", "tsx", "-e", script],
      {
        cwd: originalCwd,
      },
    );
    const result = JSON.parse(stdout) as {
      found: boolean;
      id: string | null;
    };

    assert.equal(result.found, true);
    assert.equal(result.id, "video:sora2-text-to-video-standard");
  } finally {
    if (originalPlatform === undefined) {
      delete process.env.DEPLOYMENT_PLATFORM;
    } else {
      process.env.DEPLOYMENT_PLATFORM = originalPlatform;
    }
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("resolves the public Seedance 2.0 alias from the bundled runtime catalog", async () => {
  const entry = await getCachedAiStudioCatalogEntry("video:seedance-2-0");

  assert.ok(entry);
  assert.equal(entry.id, "video:apimart-seedance-2-0");
  assert.equal(entry.alias, "seedance-2-0");
});

test("exposes Seedance 2.0 VIP variants from the bundled runtime catalog", async () => {
  const standardVip = await getCachedAiStudioCatalogEntry("video:seedance-2-0-vip");
  const fastVip = await getCachedAiStudioCatalogEntry("video:seedance-2-0-fast-vip");

  assert.ok(standardVip);
  assert.equal(standardVip.id, "video:bytedance-seedance-2");
  assert.equal(standardVip.alias, "seedance-2-0-vip");
  assert.equal(standardVip.provider, "ByteDance");

  assert.ok(fastVip);
  assert.equal(fastVip.id, "video:bytedance-seedance-2-0-fast");
  assert.equal(fastVip.alias, "seedance-2-0-fast-vip");
  assert.equal(fastVip.provider, "ByteDance");
});

test("exposes pricing rows only for models backed by pricing overrides", async () => {
  const pricedIds = [
    "video:seedance-2-0-vip",
    "video:seedance-2-0-fast-vip",
    "video:veo-3.1-lite",
    "video:veo-3.1-fast",
    "video:veo-3.1-quality",
    "video:extend-veo3-1-video",
    "video:get-veo3-1-1080p-video",
    "video:get-veo3-1-4k-video",
    "video:apimart-seedance-2-0",
    "video:apimart-seedance-2-0-fast",
    "video:wan-2-7-text-to-video",
    "video:hailuo-standard-text-to-video",
    "video:generate-ai-video",
    "video:generate-aleph-video",
  ];

  for (const id of pricedIds) {
    const entry = await getCachedAiStudioCatalogEntry(id);
    assert.ok(entry, `${id} should exist in bundled runtime catalog`);
    assert.ok(
      (entry.pricingRows?.length ?? 0) > 0,
      `${id} should expose at least one pricing row`,
    );
  }

  for (const id of [
    "video:extend-ai-video",
  ]) {
    const entry = await getCachedAiStudioCatalogEntry(id);
    assert.ok(entry, `${id} should exist in bundled runtime catalog`);
    assert.equal(entry.pricingRows.length, 0, `${id} should not expose fallback pricing`);
  }
});

test("keeps exposed override pricing rows isolated to the correct model family", async () => {
  const apimart = await getCachedAiStudioCatalogEntry("video:apimart-seedance-2-0");
  const apimartFast = await getCachedAiStudioCatalogEntry("video:apimart-seedance-2-0-fast");
  const veoLite = await getCachedAiStudioCatalogEntry("video:veo-3.1-lite");
  const veoFast = await getCachedAiStudioCatalogEntry("video:veo-3.1-fast");
  const veoQuality = await getCachedAiStudioCatalogEntry("video:veo-3.1-quality");
  const veoExtend = await getCachedAiStudioCatalogEntry("video:extend-veo3-1-video");
  const veoGet1080p = await getCachedAiStudioCatalogEntry("video:get-veo3-1-1080p-video");
  const veoGet4k = await getCachedAiStudioCatalogEntry("video:get-veo3-1-4k-video");

  assert.ok(apimart);
  assert.deepEqual(
    apimart.pricingRows.map((row) => row.creditPrice),
    ["41"],
  );

  assert.ok(apimartFast);
  assert.deepEqual(
    apimartFast.pricingRows.map((row) => row.creditPrice),
    ["33"],
  );

  assert.ok(veoLite);
  assert.deepEqual(
    [...new Set(veoLite.pricingRows.map((row) => row.creditPrice))].sort(),
    ["10", "15", "50"],
  );
  assert.deepEqual(veoLite.pricing?.selectors, {
    resolution: ["resolution"],
    aspectRatio: ["aspect_ratio"],
  });

  assert.ok(veoFast);
  assert.deepEqual(
    [...new Set(veoFast.pricingRows.map((row) => row.creditPrice))].sort(),
    ["20", "25", "60"],
  );
  assert.deepEqual(veoFast.pricing?.selectors, {
    resolution: ["resolution"],
    aspectRatio: ["aspect_ratio"],
  });
  assert.ok(veoQuality);
  assert.deepEqual(
    [...new Set(veoQuality.pricingRows.map((row) => row.creditPrice))].sort(),
    ["150", "155", "190"],
  );
  assert.deepEqual(veoQuality.pricing?.selectors, {
    resolution: ["resolution"],
    aspectRatio: ["aspect_ratio"],
  });

  assert.ok(veoExtend);
  assert.deepEqual(
    [...new Set(veoExtend.pricingRows.map((row) => row.creditPrice))].sort(),
    ["20", "250", "30"],
  );
  assert.deepEqual(
    [...new Set(veoExtend.pricingRows.map((row) => row.runtimeModel))].sort(),
    ["fast", "lite", "quality"],
  );

  assert.ok(veoGet1080p);
  assert.deepEqual(
    [...new Set(veoGet1080p.pricingRows.map((row) => row.creditPrice))].sort(),
    ["5"],
  );

  assert.ok(veoGet4k);
  assert.deepEqual(
    [...new Set(veoGet4k.pricingRows.map((row) => row.creditPrice))].sort(),
    ["40"],
  );

  const runwayGenerate = await getCachedAiStudioCatalogEntry("video:generate-ai-video");
  assert.ok(runwayGenerate);
  assert.deepEqual(
    [...new Set(runwayGenerate.pricingRows.map((row) => row.creditPrice))].sort(),
    ["12", "30"],
  );
});

test("splits one upstream model into separate runtime variants", () => {
  const compiled = compileAiStudioRuntimeCatalog({
    upstream: {
      version: 1,
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [createDetail()],
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
        "video:sora2-text-to-video-standard": {
          addRows: [
            createPricingRow({
              modelDescription: "Open AI sora 2, text-to-video, Standard-10.0s",
              creditPrice: "30",
              runtimeModel: "sora-2-text-to-video",
              pricingKey: "Market_sora2_standard_10",
            }),
          ],
        },
        "video:sora2-text-to-video-stable": {
          addRows: [
            createPricingRow({
              modelDescription: "Open AI sora 2, text-to-video, stable-10.0s",
              creditPrice: "35",
              runtimeModel: "sora-2-text-to-video-stable",
              pricingKey: "Market_sora2_stable_10",
            }),
          ],
        },
      },
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

test("validates split model build inputs without requiring pricing row overrides", () => {
  const errors = validateAiStudioRuntimeBuildInput({
    upstream: {
      version: 1,
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [createDetail()],
    },
    kiePrices: {
      version: 1,
      generatedAt: "2026-03-08T00:00:00.000Z",
      rows: [
        createKiePricingRow({
          modelDescription: "Open AI sora 2, text-to-video, Standard-10.0s",
          creditPrice: "30",
          runtimeModel: "sora-2-text-to-video",
          pricingKey: "Market_sora2_standard_10",
        }),
        createKiePricingRow({
          modelDescription: "Open AI sora 2, text-to-video, stable-10.0s",
          creditPrice: "35",
          runtimeModel: "sora-2-text-to-video-stable",
          pricingKey: "Market_sora2_stable_10",
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

  assert.deepEqual(errors, []);
});

test("hydrates runtime pricing rows only from pricing overrides", () => {
  const input = {
    upstream: {
      version: 1,
      generatedAt: "2026-03-10T00:00:00.000Z",
      items: [
        createDetail({
          id: "video:apimart-seedance-2-0",
          title: "Seedance 2.0",
          docUrl: "https://docs.apimart.ai/en/api-reference/videos/doubao-seedance-2-0/generation",
          provider: "ByteDance",
          modelKeys: ["seedance-2.0"],
          requestSchema: {
            type: "object",
            properties: {
              model: {
                type: "string",
                default: "seedance-2.0",
              },
            },
          },
          examplePayload: {
            model: "seedance-2.0",
          },
          pricingRows: [],
        }),
      ],
    },
    kiePrices: {
      version: 1,
      generatedAt: "2026-03-10T00:00:00.000Z",
      rows: [
        createKiePricingRow({
          pricingKey: "Market_seedance_kie_720",
          runtimeModel: "seedance-2.0",
          creditPrice: "999",
        }),
      ],
    },
    modelOverrides: {
      models: {},
    },
    pricingOverrides: {
      models: {
        "video:apimart-seedance-2-0": {
          addRows: [
            {
              modelDescription: "Seedance 2.0, 720p no video input",
              interfaceType: "video",
              provider: "ByteDance",
              creditPrice: "41",
              creditUnit: "per second",
              usdPrice: "",
              falPrice: "",
              discountRate: 0,
              anchor: "https://docs.apimart.ai/en/api-reference/videos/doubao-seedance-2-0/generation",
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
  assert.equal(compiled.items[0]?.pricingRows[0]?.creditPrice, "41");
  assert.equal(compiled.items[0]?.pricingRows[0]?.provider, "ByteDance");
  assert.equal(compiled.items[0]?.pricingRows[0]?.pricingKey, undefined);
});
