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
  getCachedAiStudioCatalogEntry,
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
          vendor: "apimart",
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
  assert.equal(compiled.items[0]?.vendor, "apimart");
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

test("allows split models to override vendor independently from display provider", () => {
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
              id: "video:sora2-text-to-video-apimart",
              title: "Sora2 Pro - Text to Video",
              provider: "Sora2",
              vendor: "apimart",
              schemaModel: "sora-2-pro",
              pricingMatch: {
                runtimeModel: "sora-2-text-to-video",
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

  const apimartVariant = compiled.items.find(
    (item) => item.id === "video:sora2-text-to-video-apimart",
  );

  assert.equal(apimartVariant?.provider, "Sora2");
  assert.equal(apimartVariant?.vendor, "apimart");
  assert.deepEqual(apimartVariant?.modelKeys, ["sora-2-pro"]);
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
