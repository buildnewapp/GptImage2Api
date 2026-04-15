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
import {
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
  assert.equal(compiled.items[0]?.pricingRows[0]?.creditPrice, "42");
  assert.deepEqual(compiled.items[0]?.formUi, {
    fieldOrder: ["prompt", "duration"],
    advancedFields: ["duration"],
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

test("exposes pricing rows for wan and hailuo public video models", async () => {
  const ids = [
    "video:wan-2-7-text-to-video",
    "video:wan-2-7-image-to-video",
    "video:wan-2-7-video-edit",
    "video:wan-2-7-reference-to-video",
    "video:wan-2-6-text-to-video",
    "video:wan-2-6-image-to-video",
    "video:wan-2-6-video-to-video",
    "video:wan-2-5-text-to-video",
    "video:wan-2-5-image-to-video",
    "video:wan-text-to-video",
    "video:wan-image-to-video",
    "video:wan-2-2-a14b-speech-to-video-turbo",
    "video:wan-animate-move",
    "video:wan-animate-replace",
    "video:hailuo-standard-text-to-video",
    "video:hailuo-standard-image-to-video",
    "video:hailuo-pro-text-to-video",
    "video:hailuo-pro-image-to-video",
    "video:hailuo-2-3-standard-image-to-video",
    "video:hailuo-2-3-pro-image-to-video",
  ];

  for (const id of ids) {
    const entry = await getCachedAiStudioCatalogEntry(id);
    assert.ok(entry, `${id} should exist in bundled runtime catalog`);
    assert.ok(
      (entry.pricingRows?.length ?? 0) > 0,
      `${id} should expose at least one pricing row`,
    );
  }
});

test("keeps exposed runway and kling pricing rows isolated to the correct model family", async () => {
  const runway = await getCachedAiStudioCatalogEntry("video:generate-ai-video");
  const aleph = await getCachedAiStudioCatalogEntry("video:generate-aleph-video");
  const kling30 = await getCachedAiStudioCatalogEntry("video:kling-3-0");
  const kling30Motion = await getCachedAiStudioCatalogEntry("video:kling-3-0-motion-control");
  const kling25Turbo = await getCachedAiStudioCatalogEntry(
    "video:kling-v2-5-turbo-text-to-video-pro",
  );
  const kling21Standard = await getCachedAiStudioCatalogEntry("video:kling-v2-1-standard");
  const klingAvatar = await getCachedAiStudioCatalogEntry("video:kling-ai-avatar-standard");

  assert.ok(runway);
  assert.ok(
    runway.pricingRows.every((row) => !/aleph/i.test(row.modelDescription)),
    "Runway standard entry should not include Aleph pricing rows",
  );

  assert.ok(aleph);
  assert.deepEqual(
    aleph.pricingRows.map((row) => row.modelDescription),
    ["Runway Aleph"],
  );

  assert.ok(kling30);
  assert.ok(
    kling30.pricingRows.every((row) => /kling 3\.0, video/i.test(row.modelDescription)),
    "Kling 3.0 should only include base Kling 3.0 pricing rows",
  );

  assert.ok(kling30Motion);
  assert.ok(
    kling30Motion.pricingRows.every((row) => /motion control/i.test(row.modelDescription)),
    "Kling 3.0 motion control should only include motion control rows",
  );

  assert.ok(kling25Turbo);
  assert.equal(kling25Turbo.pricingRows.length, 2);
  assert.ok(
    kling25Turbo.pricingRows.every((row) => /2\.5 turbo/i.test(row.modelDescription)),
    "Kling 2.5 turbo text-to-video should only include 2.5 turbo rows",
  );

  assert.ok(kling21Standard);
  assert.equal(kling21Standard.pricingRows.length, 2);
  assert.ok(
    kling21Standard.pricingRows.every((row) => /2\.1/i.test(row.modelDescription)),
    "Kling 2.1 standard should only include 2.1 standard rows",
  );

  assert.ok(klingAvatar);
  assert.equal(klingAvatar.pricingRows.length, 1);
  assert.match(klingAvatar.pricingRows[0]?.modelDescription ?? "", /lip sync/i);
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
