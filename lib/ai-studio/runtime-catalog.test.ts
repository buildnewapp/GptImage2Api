import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

import type { AiStudioDocDetail } from "@/lib/ai-studio/catalog";
import {
  buildAiStudioUpstreamCatalog,
  compileAiStudioRuntimeCatalog,
  getAiStudioCatalogPaths,
  getCachedAiStudioCatalogEntry,
  loadAiStudioMergedUpstreamCatalogFiles,
  loadAiStudioPricingOverridesFile,
  loadAiStudioRuntimeCatalogFile,
  loadAiStudioSchemaOverridesFile,
  toAiStudioCatalogEntries,
  validateAiStudioRuntimeBuildInput,
} from "@/lib/ai-studio/catalog";
import { resolveDynamicPricing } from "@/lib/ai-studio/runtime";

const execFile = promisify(execFileCallback);

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
    ...overrides,
  };
}

test("builds upstream catalog without embedding pricing rows", async () => {
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const originalWarn = console.warn;
  const logs: unknown[][] = [];
  const warnings: unknown[][] = [];
  console.log = (...args: unknown[]) => {
    logs.push(args);
  };
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);

    if (url === "https://docs.kie.ai/llms.txt") {
      return new Response(
        [
          "- Video Models > Sora2 [Sora2 - Text to Video](https://docs.kie.ai/market/sora2/sora-2-text-to-video.md): sample",
          "- Image Models > Google [Google - Broken HTML](https://docs.kie.ai/market/google/broken-html.md): sample",
          "",
        ].join("\n"),
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

    if (url === "https://docs.kie.ai/market/google/broken-html.md") {
      return new Response(
        "<!DOCTYPE html><title>API Documentation</title><body>Unexpected token 'o'</body>",
        { headers: { "content-type": "text/html; charset=utf-8" }, status: 200 },
      );
    }

    throw new Error(`Unexpected fetch url: ${url}`);
  }) as typeof globalThis.fetch;

  try {
    const upstream = await buildAiStudioUpstreamCatalog();
    assert.equal(upstream.items.length, 1);
    assert.equal("pricingRows" in (upstream.items[0] ?? {}), false);
    assert.ok(
      logs.some((entry) =>
        String(entry[0] ?? "").includes("[AI Studio kie] 连接: https://docs.kie.ai/llms.txt 成功: 200"),
      ),
    );
    assert.ok(
      logs.some((entry) =>
        String(entry[0] ?? "").includes("https://docs.kie.ai/market/google/broken-html.md 成功: 200"),
      ),
    );
    assert.match(String(warnings[0]?.[0] ?? ""), /Skipped 1 AI Studio catalog docs/);
    assert.match(String(warnings[1]?.[0] ?? ""), /Google - Broken HTML/);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    console.warn = originalWarn;
  }
});

test("applies dynamic pricing override config to runtime models", () => {
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
        }),
      ],
    },
    modelOverrides: {
      models: {},
    },
    pricingOverrides: {
      models: {
        "video:sora2-pro-text-to-video": {
          docUrl: "https://docs.kie.ai/market/sora2/sora-2-pro-text-to-video.md",
          price_txt: "high 10s: 165 credits | standard 15s: 135 credits",
          price_key: "{$input.size}|{$input.n_frames}",
          price_map: {
            "high|10": 165,
            "standard|15": 135,
          },
          price_final: "{$price}",
        },
      },
    },
  });

  assert.deepEqual(compiled.items[0]?.pricing, {
    docUrl: "https://docs.kie.ai/market/sora2/sora-2-pro-text-to-video.md",
    price_txt: "high 10s: 165 credits | standard 15s: 135 credits",
    price_key: "{$input.size}|{$input.n_frames}",
    price_map: {
      "high|10": 165,
      "standard|15": 135,
    },
    price_final: "{$price}",
  });
  assert.equal("pricingRows" in (compiled.items[0] ?? {}), false);
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

test("keeps fal GPT Image 2 models on billable image size controls", async () => {
  const [pricingOverrides, schemaOverrides] = await Promise.all([
    loadAiStudioPricingOverridesFile(),
    loadAiStudioSchemaOverridesFile(),
  ]);

  const compiled = compileAiStudioRuntimeCatalog({
    upstream: {
      version: 1,
      generatedAt: "2026-06-23T00:00:00.000Z",
      items: [
        ...["image:fal-openai-gpt-image-2", "image:fal-openai-gpt-image-2-edit"].map((id) =>
          createDetail({
            id,
            category: "image",
            title: id.endsWith("-edit")
              ? "OpenAI GPT Image 2 Edit"
              : "OpenAI GPT Image 2",
            docUrl: id.endsWith("-edit")
              ? "https://fal.ai/models/openai/gpt-image-2/edit/api"
              : "https://fal.ai/models/openai/gpt-image-2/api",
            provider: "fal.ai",
            endpoint: id.endsWith("-edit")
              ? "/fal-ai/gpt-image-2/edit"
              : "/fal-ai/gpt-image-2",
            modelKeys: [
              id.endsWith("-edit")
                ? "openai/gpt-image-2/edit"
                : "openai/gpt-image-2",
            ],
            requestSchema: {
              type: "object",
              properties: {
                prompt: {
                  type: "string",
                },
                image_size: {
                  default: id.endsWith("-edit") ? "auto" : "landscape_4_3",
                  anyOf: [
                    {
                      type: "object",
                      properties: {
                        width: {
                          type: "integer",
                          default: 512,
                        },
                        height: {
                          type: "integer",
                          default: 512,
                        },
                      },
                    },
                    {
                      type: "string",
                      enum: [
                        "square_hd",
                        "square",
                        "portrait_4_3",
                        "portrait_16_9",
                        "landscape_4_3",
                        "landscape_16_9",
                        "auto",
                      ],
                    },
                  ],
                },
                quality: {
                  type: "string",
                  enum: ["auto", "low", "medium", "high"],
                  default: "high",
                },
                num_images: {
                  type: "integer",
                  default: 1,
                },
              },
              required: ["prompt"],
            },
            examplePayload: {
              prompt: "A studio product photo",
              image_size: id.endsWith("-edit") ? "auto" : "landscape_4_3",
              quality: "high",
              num_images: 1,
            },
          }),
        ),
      ],
    },
    modelOverrides: {
      models: {},
    },
    pricingOverrides,
    schemaOverrides,
  });

  for (const detail of compiled.items) {
    const imageSizeSchema = detail.requestSchema?.properties?.image_size;
    const qualitySchema = detail.requestSchema?.properties?.quality;
    const pricingModel = {
      modelId: detail.id,
      title: detail.title,
      provider: detail.provider,
      category: detail.category,
    };

    assert.equal(imageSizeSchema?.type, "object");
    assert.equal(imageSizeSchema?.["x-ui-control"], "image-size");
    assert.deepEqual(imageSizeSchema?.default, {
      width: 1024,
      height: 768,
    });
    assert.deepEqual(qualitySchema?.enum, ["low", "medium", "high"]);
    assert.equal(qualitySchema?.default, "high");
    assert.deepEqual(detail.examplePayload.image_size, {
      width: 1024,
      height: 768,
    });

    assert.equal(
      resolveDynamicPricing(
        detail.pricing,
        {
          image_size: {
            width: 1024,
            height: 768,
          },
          quality: "high",
          num_images: 1,
        },
        pricingModel,
      )?.creditPrice,
      "29",
    );
    assert.equal(
      resolveDynamicPricing(detail.pricing, detail.examplePayload, pricingModel)
        ?.creditPrice,
      "29",
    );
  }
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

test("uses explicit dynamic pricing for grok imagine image pricing", () => {
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
          price_key: "{$input.enable_pro ? 'quality':'standard'}",
          price_map: {
            standard: 4,
            quality: 5,
          },
          price_final: "{$price}",
        },
      },
    },
  });

  assert.deepEqual(compiled.items[0]?.pricing, {
    price_key: "{$input.enable_pro ? 'quality':'standard'}",
    price_map: {
      standard: 4,
      quality: 5,
    },
    price_final: "{$price}",
  });
  assert.equal("pricingRows" in (compiled.items[0] ?? {}), false);
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
            id: "video:ama-seedance-2-0",
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
      ["video:sora2-text-to-video", "video:ama-seedance-2-0"],
    );
    assert.equal(loaded.items[1]?.vendor, "apimart");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("loads apimart sora 2 models from the real upstream catalog", async () => {
  const { upstreamCatalogPath } = getAiStudioCatalogPaths();
  const loaded = await loadAiStudioMergedUpstreamCatalogFiles(upstreamCatalogPath);

  const sora2 = loaded.items.find((item) => item.id === "video:ama-sora-2");
  const sora2Pro = loaded.items.find((item) => item.id === "video:ama-sora-2-pro");
  const sora2Vip = loaded.items.find((item) => item.id === "video:ama-sora-2-vip");
  const sora2Preview = loaded.items.find(
    (item) => item.id === "video:ama-sora-2-preview",
  );
  const sora2ProPreview = loaded.items.find(
    (item) => item.id === "video:ama-sora-2-pro-preview",
  );

  assert.ok(sora2);
  assert.ok(sora2Pro);
  assert.equal(sora2Vip, undefined);
  assert.equal(sora2Preview, undefined);
  assert.equal(sora2ProPreview, undefined);
  assert.deepEqual(sora2.modelKeys, ["sora-2"]);
  assert.deepEqual(sora2Pro.modelKeys, ["sora-2-pro"]);
  assert.deepEqual(
    sora2Pro.requestSchema?.properties?.model?.enum,
    ["sora-2-pro"],
  );
  assert.equal(sora2Pro.requestSchema?.properties?.resolution?.type, "string");
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
      "const entry = await mod.default.getCachedAiStudioCatalogEntry('video:ama-sora-2');",
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
    assert.equal(result.id, "video:ama-sora-2");
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
  assert.equal(entry.id, "video:ama-seedance-2-0");
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

test("exposes dynamic pricing only for models backed by pricing overrides", async () => {
  const pricedIds = [
    "video:seedance-2-0-vip",
    "video:seedance-2-0-fast-vip",
    "video:veo-3.1-lite",
    "video:veo-3.1-fast",
    "video:veo-3.1-quality",
    "video:extend-veo3-1-video",
    "video:get-veo3-1-1080p-video",
    "video:get-veo3-1-4k-video",
    "video:ama-seedance-2-0",
    "video:ama-seedance-2-0-fast",
    "video:wan-2-7-text-to-video",
    "video:hailuo-standard-text-to-video",
    "video:generate-ai-video",
    "video:generate-aleph-video",
  ];

  for (const id of pricedIds) {
    const entry = await getCachedAiStudioCatalogEntry(id);
    assert.ok(entry, `${id} should exist in bundled runtime catalog`);
    assert.ok(entry.pricing, `${id} should expose dynamic pricing`);
    assert.equal("pricingRows" in entry, false, `${id} should not expose legacy pricing rows`);
  }

  for (const id of [
    "video:extend-ai-video",
  ]) {
    const entry = await getCachedAiStudioCatalogEntry(id);
    assert.ok(entry, `${id} should exist in bundled runtime catalog`);
    assert.equal("pricingRows" in entry, false, `${id} should not expose fallback pricing`);
    assert.equal(entry.pricing, undefined, `${id} should not expose fallback pricing`);
  }
});

test("keeps exposed dynamic pricing isolated to the correct model family", async () => {
  const apimart = await getCachedAiStudioCatalogEntry("video:ama-seedance-2-0");
  const apimartFast = await getCachedAiStudioCatalogEntry("video:ama-seedance-2-0-fast");
  const veoLite = await getCachedAiStudioCatalogEntry("video:veo-3.1-lite");
  const veoFast = await getCachedAiStudioCatalogEntry("video:veo-3.1-fast");
  const veoQuality = await getCachedAiStudioCatalogEntry("video:veo-3.1-quality");
  const veoExtend = await getCachedAiStudioCatalogEntry("video:extend-veo3-1-video");
  const veoGet1080p = await getCachedAiStudioCatalogEntry("video:get-veo3-1-1080p-video");
  const veoGet4k = await getCachedAiStudioCatalogEntry("video:get-veo3-1-4k-video");

  assert.ok(apimart);
  assert.deepEqual(apimart.pricing?.price_map, { default: 41 });

  assert.ok(apimartFast);
  assert.deepEqual(apimartFast.pricing?.price_map, { default: 33 });

  assert.ok(veoLite);
  assert.deepEqual(veoLite.pricing?.price_map, {
    "720p": 10,
    "1080p": 15,
    "4k": 50,
  });

  assert.ok(veoFast);
  assert.deepEqual(veoFast.pricing?.price_map, {
    "720p": 20,
    "1080p": 25,
    "4k": 60,
  });
  assert.ok(veoQuality);
  assert.deepEqual(veoQuality.pricing?.price_map, {
    "720p": 150,
    "1080p": 155,
    "4k": 190,
  });

  assert.ok(veoExtend);
  assert.deepEqual(veoExtend.pricing?.price_map, {
    fast: 20,
    lite: 30,
    quality: 250,
  });
  assert.equal(veoExtend.pricing?.price_key, "{$model}");

  assert.ok(veoGet1080p);
  assert.deepEqual(veoGet1080p.pricing?.price_map, { default: 5 });

  assert.ok(veoGet4k);
  assert.deepEqual(veoGet4k.pricing?.price_map, { default: 40 });

  const runwayGenerate = await getCachedAiStudioCatalogEntry("video:generate-ai-video");
  assert.ok(runwayGenerate);
  assert.deepEqual(runwayGenerate.pricing?.price_map, {
    "runway-duration-5-generate|720p|5": 12,
    "runway-duration-5-generate|1080p|5": 30,
    "runway-duration-10-generate|720p|10": 30,
  });
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
            },
            {
              id: "video:sora2-text-to-video-stable",
              title: "Sora2 - Text to Video Stable",
              schemaModel: "sora-2-text-to-video-stable",
            },
          ],
        },
      },
    },
    pricingOverrides: {
      models: {
        "video:sora2-text-to-video-standard": {
          price_key: "default",
          price_map: {
            default: 30,
          },
          price_final: "{$price}",
        },
        "video:sora2-text-to-video-stable": {
          price_key: "default",
          price_map: {
            default: 35,
          },
          price_final: "{$price}",
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
  assert.equal("pricingRows" in (standard ?? {}), false);
  assert.deepEqual(standard?.pricing?.price_map, { default: 30 });

  assert.equal(stable?.alias ?? null, null);
  assert.equal(stable?.title, "Sora2 - Text to Video Stable");
  assert.equal(stable?.modelKeys[0], "sora-2-text-to-video-stable");
  assert.equal(stable?.examplePayload.model, "sora-2-text-to-video-stable");
  assert.equal(
    (stable?.requestSchema as Record<string, any>).properties.model.default,
    "sora-2-text-to-video-stable",
  );
  assert.equal("pricingRows" in (stable ?? {}), false);
  assert.deepEqual(stable?.pricing?.price_map, { default: 35 });
});

test("validates split model build inputs without pricing overrides", () => {
  const errors = validateAiStudioRuntimeBuildInput({
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
            },
            {
              id: "video:sora2-text-to-video-stable",
              title: "Sora2 - Text to Video Stable",
              schemaModel: "sora-2-text-to-video-stable",
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

test("rejects unknown billing adapters in pricing overrides", () => {
  const input = {
    upstream: {
      version: 1,
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [createDetail()],
    },
    modelOverrides: {
      models: {},
    },
    pricingOverrides: {
      models: {
        "video:sora2-text-to-video": {
          billing_adapter: "unknown_adapter",
          price_key: "{$duration}",
          price_map: {
            "5": 30,
          },
          price_final: "{$price}",
        },
      },
    },
  } satisfies Parameters<typeof compileAiStudioRuntimeCatalog>[0];

  assert.deepEqual(validateAiStudioRuntimeBuildInput(input), [
    "Unknown billing_adapter for pricing override: video:sora2-text-to-video -> unknown_adapter",
  ]);
  assert.throws(
    () => compileAiStudioRuntimeCatalog(input),
    /Unknown billing_adapter/,
  );
});

test("hydrates runtime dynamic pricing only from pricing overrides", () => {
  const input = {
    upstream: {
      version: 1,
      generatedAt: "2026-03-10T00:00:00.000Z",
      items: [
        createDetail({
          id: "video:ama-seedance-2-0",
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
        }),
      ],
    },
    modelOverrides: {
      models: {},
    },
    pricingOverrides: {
      models: {
        "video:ama-seedance-2-0": {
          docUrl: "https://docs.apimart.ai/en/api-reference/videos/doubao-seedance-2-0/generation",
          price_txt: "Seedance 2.0, 720p no video input: 41 per second",
          price_key: "default",
          price_map: {
            default: 41,
          },
          price_final: "{$price}*{$input.duration}",
        },
      },
    },
  } satisfies Parameters<typeof compileAiStudioRuntimeCatalog>[0];

  assert.deepEqual(validateAiStudioRuntimeBuildInput(input), []);

  const compiled = compileAiStudioRuntimeCatalog(input);
  assert.equal("pricingRows" in (compiled.items[0] ?? {}), false);
  assert.deepEqual(compiled.items[0]?.pricing, {
    docUrl: "https://docs.apimart.ai/en/api-reference/videos/doubao-seedance-2-0/generation",
    price_txt: "Seedance 2.0, 720p no video input: 41 per second",
    price_key: "default",
    price_map: {
      default: 41,
    },
    price_final: "{$price}*{$input.duration}",
  });
});
