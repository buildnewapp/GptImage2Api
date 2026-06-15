import assert from "node:assert/strict";
import test from "node:test";

import {
  assertAiStudioCatalogCanReplaceExisting,
  buildAiStudioFalCatalog,
  buildAiStudioUpstreamCatalog,
  extractFalPricingTextFromLlms,
  findAiStudioCatalogEntryById,
  parseFalCatalogModels,
  parseFalOpenApiModel,
  parseApimartDocMarkdown,
  parseApimartLlmsFull,
  parseApimartLlmsIndex,
  parseApiDocMarkdown,
  parseLlmsIndex,
  sortAiStudioCatalogItems,
  syncAiStudioFalModelPrices,
} from "@/lib/ai-studio/catalog";

const llmsSample = `
## API Docs
- Image    Models > Google [Google - Nano Banana 2](https://docs.kie.ai/market/google/nanobanana2.md): Image generation by Nano Banana 2
- Video Models > Grok Imagine [Grok Imagine Image to Video](https://docs.kie.ai/market/grok-imagine/image-to-video.md): ## Query Task Status
- Video Models > Bytedance [Bytedance - V1 Pro Text to Video](https://docs.kie.ai/market/bytedance/v1-pro-text-to-video.md): ## Query Task Status
- Chat  Models > GPT [GPT-5-2](https://docs.kie.ai/market/chat/gpt-5-2.md): > GPT-5-2 API
- Veo3.1 API [Generate Veo3.1 Video](https://docs.kie.ai/veo3-api/generate-veo-3-video.md): ::: info[]
- Suno API > Music Generation [Generate Music](https://docs.kie.ai/suno-api/generate-music.md): Generate music with or without lyrics using AI models.
- Video Models > HappyHorse [HappyHorse 1.1 图生视频](https://docs.kie.ai/38308980e0.md): Old localized generated doc
- [Get Task Details](https://docs.kie.ai/market/common/get-task-detail.md): Query the status and results
- [Claude Code + kie.ai Integration Guide](https://docs.kie.ai/2152008m0.md): Integration setup
- [Claude Code 对接 kie.ai 使用指南](https://docs.kie.ai/2151374m0.md): Integration setup
- Suno API > Voice [Suno Voice Generation Callback](https://docs.kie.ai/suno-api/suno-voice-generate-callback.md): Callback payload
`;

const imageDocSample = `
# Google - Nano Banana 2

## OpenAPI Specification

\`\`\`yaml
openapi: 3.0.1
paths:
  /api/v1/jobs/createTask:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                model:
                  type: string
                  enum:
                    - google/nano-banana-2
                  default: google/nano-banana-2
                input:
                  type: object
                  properties:
                    prompt:
                      type: string
                    resolution:
                      type: string
                      enum:
                        - 1K
                        - 2K
                        - 4K
            example:
              model: google/nano-banana-2
              input:
                prompt: A cinematic portrait
                resolution: 4K
\`\`\`
`;

const musicDocSample = `
# Generate Music

## OpenAPI Specification

\`\`\`yaml
openapi: 3.0.1
paths:
  /api/v1/generate:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                model:
                  type: string
                  enum:
                    - V4
                    - V4_5
                    - V5
                customMode:
                  type: boolean
                prompt:
                  type: string
            example:
              model: V5
              customMode: false
              instrumental: false
              prompt: A dreamy city pop song
\`\`\`
`;

const falOpenApiModelSample = {
  endpoint_id: "bytedance/seedance-2.0/text-to-video",
  metadata: {
    display_name: "Seedance 2.0 Text to Video API",
    category: "text-to-video",
    group: "bytedance",
  },
  pricing: {
    unit_price: 0.1,
    unit: "video",
    currency: "USD",
  },
  openapi: {
    openapi: "3.0.4",
    components: {
      schemas: {
        QueueStatus: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["IN_QUEUE", "IN_PROGRESS", "COMPLETED"],
            },
            request_id: {
              type: "string",
            },
          },
        },
        SeedanceInput: {
          type: "object",
          required: ["prompt"],
          "x-fal-order-properties": ["prompt", "aspect_ratio"],
          properties: {
            prompt: {
              type: "string",
              examples: ["A cinematic product video"],
            },
            aspect_ratio: {
              type: "string",
              enum: ["16:9", "9:16"],
              default: "16:9",
            },
          },
        },
      },
    },
    paths: {
      "/fal-ai/seedance-2/text-to-video/requests/{request_id}/status": {
        get: {},
      },
      "/fal-ai/seedance-2/text-to-video/requests/{request_id}/cancel": {
        put: {},
      },
      "/fal-ai/seedance-2/text-to-video": {
        post: {
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SeedanceInput",
                },
              },
            },
          },
        },
      },
      "/fal-ai/seedance-2/text-to-video/requests/{request_id}": {
        get: {},
      },
    },
    servers: [{ url: "https://queue.fal.run" }],
  },
};

const falLlmsSample = `
# Wan 2.7 Text to Video

## Pricing

Your request will cost **$0.1** per second for 720p resolution. For 1080p your request will cost **$0.15** per second.

For more details, see [fal.ai pricing](https://fal.ai/pricing).

## API Information

This model can be used via our HTTP API.
`;

const falMultiLinePricingLlmsSample = `
# GPT Image 2

## Pricing

Text tokens (per 1M): **$5.00** input, **$1.25** cached, **$10.00** output.
Image tokens (per 1M): **$8.00** input, **$2.00** cached, **$30.00** output. Changing the **quality** parameter significantly affects cost; by default we use **high**. Adjust it to your preference.
See the description at the bottom of this page for more details on how much canonical image sizes cost. Total cost is rounded up to the closest hundredth of a cent ($0.0001.)

For more details, see [fal.ai pricing](https://fal.ai/pricing).
`;

const apimartFullSample = `
# Sora2 Video Generation
Source: https://docs.apimart.ai/en/api-reference/videos/sora-2/generation

POST https://api.apimart.ai/v1/videos/generations

<ParamField body="model" type="string" required>
  Video generation model name

  Supported models:

  * \`sora-2\` Sora 2 standard
  * \`sora-2-pro\` Sora 2 Pro
</ParamField>

<ParamField body="prompt" type="string" required>
  Text description for video generation
</ParamField>

<ParamField body="duration" type="integer" default="4">
  Supported values: \`4\`, \`8\`, \`12\`, \`16\`, \`20\`
</ParamField>

\`\`\`json theme={null}
{
  "model": "sora-2",
  "prompt": "A waterfall cascading down forming a rainbow",
  "duration": 8
}
\`\`\`

# Query User Balance
Source: https://docs.apimart.ai/en/api-reference/account/user-balance

GET https://api.apimart.ai/v1/user/balance
`;

const apimartIndexSample = `
# APIMart

## Docs

- [GPT-Image-2 Image Generation](https://docs.apimart.ai/en/api-reference/images/gpt-image-2/generation.md): Image generation
- [Query User Balance](https://docs.apimart.ai/en/api-reference/account/user-balance.md): Account balance
`;

const apimartMarkdownSample = `
# GPT-Image-2 Image Generation

<RequestExample>
  \`\`\`bash cURL theme={null}
  curl --request POST \\
    --url https://api.apimart.ai/v1/images/generations \\
    --header 'Authorization: Bearer <token>' \\
    --header 'Content-Type: application/json' \\
    --data '{
      "model": "gpt-image-2",
      "prompt": "A ginger cat",
      "image_urls": ["https://example.com/photo.jpg"],
      "n": 1
    }'
  \`\`\`
</RequestExample>

<ParamField body="model" type="string" default="gpt-image-2" required>
  Image generation model name

  Fixed to \`gpt-image-2\`
</ParamField>

<ParamField body="prompt" type="string" required>
  Text description for image generation
</ParamField>

<ParamField body="image_urls" type="array">
  Reference image array. Switches to image-to-image mode when provided.
</ParamField>

<ParamField body="n" type="integer" default="1">
  Number of images to generate
  Range: 1
</ParamField>

<ParamField body="official_fallback" type="boolean" default="false">
  Whether to fall back to the official channel
</ParamField>

`;

test("parses the official llms index into supported catalog entries", () => {
  const entries = parseLlmsIndex(llmsSample);

  assert.equal(entries.length, 6);
  assert.deepEqual(
    entries.map((entry) => entry.category),
    ["image", "video", "video", "chat", "video", "music"],
  );
  assert.equal(entries[0]?.title, "Google - Nano Banana 2");
  assert.equal(entries[1]?.docUrl, "https://docs.kie.ai/market/grok-imagine/image-to-video.md");
  assert.equal(entries[2]?.id, "video:bytedance-v1-pro-text-to-video");
  assert.equal(entries[4]?.id, "video:generate-veo3-1-video");
});

test("sorts ai studio catalog items by stable model id", () => {
  const items = [
    { id: "video:zeta" },
    { id: "image:alpha" },
    { id: "chat:beta" },
  ] as any[];

  const sorted = sortAiStudioCatalogItems(items);

  assert.deepEqual(sorted.map((item) => item.id), [
    "chat:beta",
    "image:alpha",
    "video:zeta",
  ]);
  assert.deepEqual(items.map((item) => item.id), [
    "video:zeta",
    "image:alpha",
    "chat:beta",
  ]);
});

test("rejects suspicious ai studio catalog shrink before overwrite", () => {
  const existing = {
    version: 1,
    generatedAt: "2026-06-22T13:01:37.753Z",
    items: Array.from({ length: 160 }, (_, index) => ({ id: `video:old-${index}` })),
  } as any;
  const next = {
    version: 1,
    generatedAt: "2026-06-23T05:15:13.830Z",
    items: Array.from({ length: 20 }, (_, index) => ({ id: `video:new-${index}` })),
  } as any;

  assert.throws(
    () => assertAiStudioCatalogCanReplaceExisting(next, existing, "catalog.json"),
    /refusing to overwrite catalog\.json: new AI Studio catalog has 20 items, existing has 160/i,
  );
});

test("limits concurrent kie catalog doc fetches", async () => {
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const originalConcurrency = process.env.AI_STUDIO_FETCH_CONCURRENCY;
  const originalInterval = process.env.AI_STUDIO_FETCH_INTERVAL_MS;
  let activeDocFetches = 0;
  let maxActiveDocFetches = 0;

  process.env.AI_STUDIO_FETCH_CONCURRENCY = "1";
  process.env.AI_STUDIO_FETCH_INTERVAL_MS = "1";
  console.log = () => {};
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);

    if (url === "https://docs.kie.ai/llms.txt") {
      return new Response(
        [
          "- Image Models > Google [Google - Model A](https://docs.kie.ai/market/google/model-a.md): sample",
          "- Image Models > Google [Google - Model B](https://docs.kie.ai/market/google/model-b.md): sample",
          "- Image Models > Google [Google - Model C](https://docs.kie.ai/market/google/model-c.md): sample",
          "- Image Models > Google [Google - Model D](https://docs.kie.ai/market/google/model-d.md): sample",
        ].join("\n"),
        { status: 200 },
      );
    }

    if (url.startsWith("https://docs.kie.ai/market/google/model-")) {
      activeDocFetches += 1;
      maxActiveDocFetches = Math.max(maxActiveDocFetches, activeDocFetches);
      await new Promise((resolve) => setTimeout(resolve, 10));
      activeDocFetches -= 1;

      const model = url.split("/").at(-1)?.replace(".md", "") ?? "model";
      return new Response(
        [
          "# Google Model",
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
          `                  default: google/${model}`,
          "```",
          "",
        ].join("\n"),
        { status: 200 },
      );
    }

    throw new Error(`Unexpected fetch url: ${url}`);
  }) as typeof globalThis.fetch;

  try {
    const upstream = await buildAiStudioUpstreamCatalog();

    assert.equal(upstream.items.length, 4);
    assert.equal(maxActiveDocFetches, 1);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    if (originalConcurrency === undefined) {
      delete process.env.AI_STUDIO_FETCH_CONCURRENCY;
    } else {
      process.env.AI_STUDIO_FETCH_CONCURRENCY = originalConcurrency;
    }
    if (originalInterval === undefined) {
      delete process.env.AI_STUDIO_FETCH_INTERVAL_MS;
    } else {
      process.env.AI_STUDIO_FETCH_INTERVAL_MS = originalInterval;
    }
  }
});

test("parses endpoint, method, model keys, and example payload from an image doc", () => {
  const detail = parseApiDocMarkdown({
    category: "image",
    title: "Google - Nano Banana 2",
    docUrl: "https://docs.kie.ai/market/google/nanobanana2.md",
  }, imageDocSample);

  assert.equal(detail.endpoint, "/api/v1/jobs/createTask");
  assert.equal(detail.method, "POST");
  assert.deepEqual(detail.modelKeys, ["google/nano-banana-2"]);
  assert.equal(detail.examplePayload.model, "google/nano-banana-2");
  assert.equal(detail.examplePayload.input?.resolution, "4K");
});

test("parses fal model openapi with resolved request schema and queue endpoints without pricing rows", () => {
  const detail = parseFalOpenApiModel(
    {
      id: "bytedance/seedance-2.0/text-to-video",
    },
    falOpenApiModelSample,
  );

  assert.equal(detail.vendor, "fal");
  assert.equal(detail.id, "video:fal-bytedance-seedance-2-0-text-to-video");
  assert.equal(detail.endpoint, "/fal-ai/seedance-2/text-to-video");
  assert.equal(detail.method, "POST");
  assert.equal(
    detail.statusEndpoint,
    "/fal-ai/seedance-2/requests/{request_id}/status",
  );
  assert.deepEqual(detail.modelKeys, ["bytedance/seedance-2.0/text-to-video"]);
  assert.equal(detail.requestSchema?.properties?.prompt?.type, "string");
  assert.deepEqual(detail.requestSchema?.["x-apidog-orders"], [
    "prompt",
    "aspect_ratio",
  ]);
  assert.equal(detail.examplePayload.prompt, "A cinematic product video");
  assert.equal(detail.examplePayload.aspect_ratio, "16:9");
  assert.equal("pricingRows" in detail, false);
});

test("parses fal queue status endpoints using sdk app id rules for nested model paths", () => {
  const detail = parseFalOpenApiModel(
    "fal-ai/bytedance/seedream/v5/lite/text-to-image",
    {
      ...falOpenApiModelSample,
      endpoint_id: "fal-ai/bytedance/seedream/v5/lite/text-to-image",
      openapi: {
        ...falOpenApiModelSample.openapi,
        paths: {
          "/fal-ai/bytedance/seedream/v5/lite/text-to-image/requests/{request_id}/status": {
            get: {},
          },
          "/fal-ai/bytedance/seedream/v5/lite/text-to-image": {
            post: {
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/SeedanceInput",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  );

  assert.equal(
    detail.endpoint,
    "/fal-ai/bytedance/seedream/v5/lite/text-to-image",
  );
  assert.equal(
    detail.statusEndpoint,
    "/fal-ai/bytedance/requests/{request_id}/status",
  );
});

test("builds a fal catalog from endpoint id allowlist models in config order", () => {
  const catalog = parseFalCatalogModels({
    version: 1,
    models: [
      "bytedance/seedance-2.0/text-to-video",
    ],
  }, [falOpenApiModelSample]);

  assert.equal(catalog.version, 1);
  assert.equal(catalog.items.length, 1);
  assert.equal(catalog.items[0]?.id, "video:fal-bytedance-seedance-2-0-text-to-video");
  assert.equal(catalog.items[0]?.endpoint, "/fal-ai/seedance-2/text-to-video");
});

test("extracts fal pricing text from the llms pricing section", () => {
  assert.equal(
    extractFalPricingTextFromLlms(falLlmsSample),
    "Your request will cost **$0.1** per second for 720p resolution. For 1080p your request will cost **$0.15** per second.",
  );
});

test("extracts multi-line fal pricing text from the llms pricing section", () => {
  assert.equal(
    extractFalPricingTextFromLlms(falMultiLinePricingLlmsSample),
    [
      "Text tokens (per 1M): **$5.00** input, **$1.25** cached, **$10.00** output.",
      "Image tokens (per 1M): **$8.00** input, **$2.00** cached, **$30.00** output. Changing the **quality** parameter significantly affects cost; by default we use **high**. Adjust it to your preference.",
      "See the description at the bottom of this page for more details on how much canonical image sizes cost. Total cost is rounded up to the closest hundredth of a cent ($0.0001.)",
    ].join("\n"),
  );
});

test("syncs fal llms pricing text into fal model prices", async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls: string[] = [];

  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    requestedUrls.push(url);

    if (url.includes("/v1/models/pricing")) {
      throw new Error(`Unexpected pricing API fetch: ${url}`);
    }

    if (url === "https://fal.ai/models/bytedance/seedance-2.0/text-to-video/llms.txt") {
      return new Response(falLlmsSample, { status: 200 });
    }

    throw new Error(`Unexpected fetch url: ${url}`);
  }) as typeof globalThis.fetch;

  try {
    const synced = await syncAiStudioFalModelPrices({
      version: 1,
      models: [
        "bytedance/seedance-2.0/text-to-video",
        {
          id: "disabled/model",
          enabled: false,
        },
      ],
      prices: {
        "disabled/model": "stale disabled price",
      },
    });

    assert.deepEqual(synced.prices, {
      "bytedance/seedance-2.0/text-to-video":
        "Your request will cost **$0.1** per second for 720p resolution. For 1080p your request will cost **$0.15** per second.",
    });
    assert.deepEqual(requestedUrls, [
      "https://fal.ai/models/bytedance/seedance-2.0/text-to-video/llms.txt",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("syncs fal catalog without fetching fal pricing", async () => {
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const originalFalApiKey = process.env.FAL_API_KEY;
  const originalFalKey = process.env.FAL_KEY;
  const requestedUrls: string[] = [];
  const requestedAuth: unknown[] = [];
  const logs: unknown[][] = [];

  process.env.FAL_API_KEY = "fal-test-key";
  delete process.env.FAL_KEY;
  console.log = (...args: unknown[]) => {
    logs.push(args);
  };
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    requestedUrls.push(url);
    requestedAuth.push((init?.headers as Record<string, unknown> | undefined)?.Authorization);

    if (url.includes("/v1/models/pricing")) {
      throw new Error(`Unexpected pricing fetch: ${url}`);
    }

    if (url.startsWith("https://api.fal.ai/v1/models?")) {
      return Response.json({
        models: [falOpenApiModelSample],
      });
    }

    throw new Error(`Unexpected fetch url: ${url}`);
  }) as typeof globalThis.fetch;

  try {
    const catalog = await buildAiStudioFalCatalog({
      version: 1,
      models: ["bytedance/seedance-2.0/text-to-video"],
    });

    assert.equal(catalog.items.length, 1);
    assert.equal("pricingRows" in (catalog.items[0] ?? {}), false);
    assert.equal(requestedUrls.length, 1);
    assert.match(requestedUrls[0] ?? "", /^https:\/\/api\.fal\.ai\/v1\/models\?/);
    assert.deepEqual(requestedAuth, ["Key fal-test-key"]);
    assert.ok(
      logs.some((entry) =>
        String(entry[0] ?? "").includes("认证: 已带 FAL API Key") &&
        String(entry[0] ?? "").includes("成功: 200"),
      ),
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    if (originalFalApiKey === undefined) {
      delete process.env.FAL_API_KEY;
    } else {
      process.env.FAL_API_KEY = originalFalApiKey;
    }
    if (originalFalKey === undefined) {
      delete process.env.FAL_KEY;
    } else {
      process.env.FAL_KEY = originalFalKey;
    }
  }
});

test("spaces fal catalog fetch requests by the configured interval", async () => {
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const originalFalApiKey = process.env.FAL_API_KEY;
  const originalFalKey = process.env.FAL_KEY;
  const originalInterval = process.env.AI_STUDIO_FETCH_INTERVAL_MS;
  const originalConcurrency = process.env.AI_STUDIO_FETCH_CONCURRENCY;
  const requestedAt: number[] = [];

  delete process.env.FAL_API_KEY;
  delete process.env.FAL_KEY;
  process.env.AI_STUDIO_FETCH_INTERVAL_MS = "25";
  process.env.AI_STUDIO_FETCH_CONCURRENCY = "2";
  console.log = () => {};
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    requestedAt.push(Date.now());

    if (url.includes("endpoint_id=bytedance%2Fseedance-2.0%2Ftext-to-video")) {
      return Response.json({
        models: [falOpenApiModelSample],
      });
    }

    if (url.includes("endpoint_id=bytedance%2Fseedance-2.0%2Fimage-to-video")) {
      return Response.json({
        models: [
          {
            ...falOpenApiModelSample,
            endpoint_id: "bytedance/seedance-2.0/image-to-video",
          },
        ],
      });
    }

    throw new Error(`Unexpected fetch url: ${url}`);
  }) as typeof globalThis.fetch;

  try {
    const catalog = await buildAiStudioFalCatalog({
      version: 1,
      models: [
        "bytedance/seedance-2.0/text-to-video",
        "bytedance/seedance-2.0/image-to-video",
      ],
    });

    assert.equal(catalog.items.length, 2);
    assert.equal(requestedAt.length, 2);
    assert.ok(
      (requestedAt[1] ?? 0) - (requestedAt[0] ?? 0) >= 20,
      `expected second request to wait, got ${requestedAt[1]! - requestedAt[0]!}ms`,
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    if (originalFalApiKey === undefined) {
      delete process.env.FAL_API_KEY;
    } else {
      process.env.FAL_API_KEY = originalFalApiKey;
    }
    if (originalFalKey === undefined) {
      delete process.env.FAL_KEY;
    } else {
      process.env.FAL_KEY = originalFalKey;
    }
    if (originalInterval === undefined) {
      delete process.env.AI_STUDIO_FETCH_INTERVAL_MS;
    } else {
      process.env.AI_STUDIO_FETCH_INTERVAL_MS = originalInterval;
    }
    if (originalConcurrency === undefined) {
      delete process.env.AI_STUDIO_FETCH_CONCURRENCY;
    } else {
      process.env.AI_STUDIO_FETCH_CONCURRENCY = originalConcurrency;
    }
  }
});

test("skips fal catalog models that fail to fetch", async () => {
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalFalApiKey = process.env.FAL_API_KEY;
  const originalFalKey = process.env.FAL_KEY;
  const originalInterval = process.env.AI_STUDIO_FETCH_INTERVAL_MS;
  const requestedUrls: string[] = [];
  const logs: unknown[][] = [];
  const warnings: unknown[][] = [];

  delete process.env.FAL_API_KEY;
  delete process.env.FAL_KEY;
  process.env.AI_STUDIO_FETCH_INTERVAL_MS = "1";
  console.log = (...args: unknown[]) => {
    logs.push(args);
  };
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    requestedUrls.push(url);

    if (url.includes("endpoint_id=bytedance%2Fseedance-2.0%2Ftext-to-video")) {
      return Response.json({
        models: [falOpenApiModelSample],
      });
    }

    if (url.includes("endpoint_id=missing%2Fmodel")) {
      return new Response("upstream unavailable", { status: 503 });
    }

    throw new Error(`Unexpected fetch url: ${url}`);
  }) as typeof globalThis.fetch;

  try {
    const catalog = await buildAiStudioFalCatalog({
      version: 1,
      models: [
        "bytedance/seedance-2.0/text-to-video",
        "missing/model",
      ],
    });

    assert.equal(catalog.items.length, 1);
    assert.equal(catalog.items[0]?.id, "video:fal-bytedance-seedance-2-0-text-to-video");
    assert.equal(requestedUrls.length, 2);
    assert.ok(
      logs.some((entry) =>
        String(entry[0] ?? "").includes("连接: https://api.fal.ai/v1/models?") &&
        String(entry[0] ?? "").includes("成功: 200"),
      ),
    );
    assert.ok(
      logs.some((entry) =>
        String(entry[0] ?? "").includes("endpoint_id=missing%2Fmodel") &&
        String(entry[0] ?? "").includes("失败: 503 upstream unavailable"),
      ),
    );
    assert.match(String(warnings[0]?.[0] ?? ""), /Skipped 1 AI Studio fal catalog models/);
    assert.match(String(warnings[1]?.[0] ?? ""), /missing\/model/);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    console.warn = originalWarn;
    if (originalFalApiKey === undefined) {
      delete process.env.FAL_API_KEY;
    } else {
      process.env.FAL_API_KEY = originalFalApiKey;
    }
    if (originalFalKey === undefined) {
      delete process.env.FAL_KEY;
    } else {
      process.env.FAL_KEY = originalFalKey;
    }
    if (originalInterval === undefined) {
      delete process.env.AI_STUDIO_FETCH_INTERVAL_MS;
    } else {
      process.env.AI_STUDIO_FETCH_INTERVAL_MS = originalInterval;
    }
  }
});

test("rejects fal catalog sync when most models fail to fetch", async () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const originalFalApiKey = process.env.FAL_API_KEY;
  const originalFalKey = process.env.FAL_KEY;
  const originalInterval = process.env.AI_STUDIO_FETCH_INTERVAL_MS;

  delete process.env.FAL_API_KEY;
  delete process.env.FAL_KEY;
  process.env.AI_STUDIO_FETCH_INTERVAL_MS = "1";
  console.warn = () => {};
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);

    if (url.includes("endpoint_id=bytedance%2Fseedance-2.0%2Ftext-to-video")) {
      return Response.json({
        models: [falOpenApiModelSample],
      });
    }

    if (
      url.includes("endpoint_id=missing%2Fmodel-a") ||
      url.includes("endpoint_id=missing%2Fmodel-b")
    ) {
      return new Response("rate limited", { status: 429 });
    }

    throw new Error(`Unexpected fetch url: ${url}`);
  }) as typeof globalThis.fetch;

  try {
    await assert.rejects(
      () => buildAiStudioFalCatalog({
        version: 1,
        models: [
          "bytedance/seedance-2.0/text-to-video",
          "missing/model-a",
          "missing/model-b",
        ],
      }),
      /2\/3 models failed to fetch/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
    if (originalFalApiKey === undefined) {
      delete process.env.FAL_API_KEY;
    } else {
      process.env.FAL_API_KEY = originalFalApiKey;
    }
    if (originalFalKey === undefined) {
      delete process.env.FAL_KEY;
    } else {
      process.env.FAL_KEY = originalFalKey;
    }
    if (originalInterval === undefined) {
      delete process.env.AI_STUDIO_FETCH_INTERVAL_MS;
    } else {
      process.env.AI_STUDIO_FETCH_INTERVAL_MS = originalInterval;
    }
  }
});

test("parses enum-backed model options from a music doc", () => {
  const detail = parseApiDocMarkdown({
    category: "music",
    title: "Generate Music",
    docUrl: "https://docs.kie.ai/suno-api/generate-music.md",
  }, musicDocSample);

  assert.equal(detail.endpoint, "/api/v1/generate");
  assert.deepEqual(detail.modelKeys, ["V4", "V4_5", "V5"]);
  assert.equal(detail.examplePayload.model, "V5");
});

test("parses apimart llms-full sections into model catalog details", () => {
  const catalog = parseApimartLlmsFull(apimartFullSample);

  assert.equal(catalog.items.length, 2);
  assert.deepEqual(
    catalog.items.map((item) => item.id),
    ["video:ama-sora-2", "video:ama-sora-2-pro"],
  );
  assert.equal(catalog.items[0]?.vendor, "apimart");
  assert.equal(catalog.items[0]?.endpoint, "/v1/videos/generations");
  assert.equal(catalog.items[0]?.statusEndpoint, "/v1/tasks/{taskId}?language=en");
  assert.deepEqual(catalog.items[1]?.modelKeys, ["sora-2-pro"]);
  assert.deepEqual(catalog.items[1]?.requestSchema?.properties?.model?.enum, [
    "sora-2-pro",
  ]);
  assert.equal(catalog.items[1]?.examplePayload.model, "sora-2-pro");
});

test("parses apimart llms index and markdown docs with body fields", () => {
  const seeds = parseApimartLlmsIndex(apimartIndexSample);

  assert.deepEqual(seeds, [
    {
      title: "GPT-Image-2 Image Generation",
      docUrl: "https://docs.apimart.ai/en/api-reference/images/gpt-image-2/generation.md",
    },
  ]);

  const details = parseApimartDocMarkdown(
    seeds[0]!.title,
    seeds[0]!.docUrl,
    apimartMarkdownSample,
  );

  assert.equal(details.length, 1);
  assert.equal(details[0]?.id, "image:ama-gpt-image-2");
  assert.equal(
    details[0]?.docUrl,
    "https://docs.apimart.ai/en/api-reference/images/gpt-image-2/generation",
  );
  assert.equal(details[0]?.requestSchema?.properties?.image_urls?.type, "array");
  assert.equal(details[0]?.requestSchema?.properties?.n, undefined);
  assert.equal(details[0]?.requestSchema?.properties?.official_fallback?.type, "boolean");
  assert.equal(details[0]?.requestSchema?.properties?.official_fallback?.default, false);
  assert.equal("n" in details[0]!.examplePayload, false);
  assert.deepEqual(details[0]?.requestSchema?.required, ["model", "prompt"]);
});

test("normalizes apimart media url arrays with incomplete item schemas", () => {
  const details = parseApimartDocMarkdown(
    "Gemini-3.1-Flash Image Generation",
    "https://docs.apimart.ai/en/api-reference/images/gemini-3.1-flash/generation.md",
    `
# Gemini-3.1-Flash Image Generation

POST https://api.apimart.ai/v1/images/generations

<ParamField body="model" type="string" default="gemini-3.1-flash-image-preview" required>
  Image generation model name
  Supported models:
  * \`gemini-3.1-flash-image-preview\`
</ParamField>

<ParamField body="prompt" type="string">
  Text prompt
</ParamField>

<ParamField body="image_urls" type="array">
  Reference image URL list for image-to-image generation
  Two formats are supported:
  **1. Full image URL**
  * Publicly accessible image URL (http\\:// or https\\://)
  * Example: https://example.com/image.jpg
  **2. Base64 encoded format**
  * Format: \`data:image/{format};base64,{base64data}\`
  * Example: \`data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABg...\`
  **Limitations:**
  * Maximum **14** reference images
  * Supported image formats: \`jpeg\`, \`png\`, \`webp\`
</ParamField>

<ParamField body="reference_audio_urls" type="array">
  Enter a list of audio URLs or asset://{assetId}.
  Duration: maximum 3 reference audios, total duration not exceeding 15 s.
</ParamField>

\`\`\`json
{
  "model": "gemini-3.1-flash-image-preview",
  "prompt": "A product shot",
  "image_urls": ["https://example.com/image.jpg"],
  "reference_audio_urls": ["asset://asset-20260404242101-76djj"]
}
\`\`\`
`,
  );

  const imageUrls = details[0]?.requestSchema?.properties?.image_urls;
  const audioUrls = details[0]?.requestSchema?.properties?.reference_audio_urls;

  assert.deepEqual(imageUrls?.items, {
    type: "string",
    format: "uri",
  });
  assert.equal(imageUrls?.maxItems, 14);
  assert.equal(imageUrls?.enum, undefined);
  assert.deepEqual(audioUrls?.items, {
    type: "string",
    format: "uri",
  });
  assert.equal(audioUrls?.maxItems, 3);
});

test("parses apimart generic array types without treating nested examples as urls", () => {
  const details = parseApimartDocMarkdown(
    "wan2.7 Image Generation & Editing",
    "https://docs.apimart.ai/en/api-reference/images/wan2.7-image/generation.md",
    `
# wan2.7 Image Generation & Editing

POST https://api.apimart.ai/v1/images/generations

<ParamField body="model" type="string" default="wan2.7-image-pro" required>
  Image generation model name.
  * \`wan2.7-image-pro\`
  * \`wan2.7-image\`
</ParamField>

<ParamField body="image_urls" type="array<string>">
  Input image URL array for editing and multi-image reference scenarios.
  **Constraints:** Up to 9 images; JPEG / PNG / WEBP / BMP.
</ParamField>

<ParamField body="bbox_list" type="array">
  Bounding boxes for interactive editing.
  **Structure:** \`[[[x1, y1, x2, y2], ...], ...]\`
  * Outer array length must equal the length of \`image_urls\`
  * Max 2 boxes per image
  Example: \`[[], [[989, 515, 1138, 681]]]\`
</ParamField>

<ParamField body="color_palette" type="array<object>">
  Custom color theme.
  * 3–10 entries; each entry requires \`hex\` and \`ratio\`
  \`\`\`json
  [
    { "hex": "#C2D1E6", "ratio": "23.51%" }
  ]
  \`\`\`
</ParamField>

\`\`\`json
{
  "model": "wan2.7-image-pro",
  "image_urls": ["https://example.com/image.jpg"]
}
\`\`\`
`,
  );

  const properties = details[0]?.requestSchema?.properties;

  assert.deepEqual(properties?.image_urls?.items, {
    type: "string",
    format: "uri",
  });
  assert.equal(properties?.image_urls?.maxItems, 9);
  assert.equal(properties?.bbox_list?.type, "array");
  assert.deepEqual(properties?.bbox_list?.items, {});
  assert.equal(properties?.bbox_list?.maxItems, undefined);
  assert.equal(properties?.color_palette?.type, "array");
  assert.deepEqual(properties?.color_palette?.items, {
    type: "object",
  });
});

test("does not infer apimart enum options from supported parameter lists", () => {
  const details = parseApimartDocMarkdown(
    "Z-Image-Turbo Image Generation",
    "https://docs.apimart.ai/en/api-reference/images/z-image-turbo/generation.md",
    `
# Z-Image-Turbo Image Generation

POST https://api.apimart.ai/v1/images/generations

<ParamField body="model" type="string" default="z-image-turbo" required>
  Model name
  * \`z-image-turbo\` - Lightweight and fast image generation
</ParamField>

<ParamField body="prompt" type="string" required>
  Text description for image generation, up to 800 characters
</ParamField>

<ParamField body="size" type="string" default="1:1">
  Image aspect ratio
  Supported aspect ratios:
  * \`1:1\` - Square (default)
  * \`4:3\` - Landscape 4:3
  * \`3:4\` - Portrait 3:4
  * \`16:9\` - Landscape widescreen
  * \`9:16\` - Portrait vertical
  * \`3:2\` - Landscape 3:2
  * \`2:3\` - Portrait 2:3
</ParamField>

<ParamField body="resolution" type="string" default="1K">
  Resolution tier
  * \`1K\` - Standard resolution (default)
  * \`2K\` - High definition resolution
</ParamField>

<ParamField body="prompt_extend" type="boolean" default="false">
  Smart prompt rewriting
  * \`false\` - Disabled (default)
  * \`true\` - Enabled
</ParamField>

\`\`\`json
{
  "model": "z-image-turbo",
  "prompt": "Ink painting style landscape scenery"
}
\`\`\`
`,
  );

  const properties = details[0]?.requestSchema?.properties;

  assert.equal(properties?.size?.enum, undefined);
  assert.equal(properties?.resolution?.enum, undefined);
  assert.equal(properties?.prompt_extend?.enum, undefined);
});

test("finds canonical bytedance entries from legacy slash-style public ids", () => {
  const entry = findAiStudioCatalogEntryById(
    [
      {
        id: "video:bytedance-v1-pro-text-to-video",
        category: "video",
        title: "Bytedance - V1 Pro Text to Video",
        provider: "Bytedance",
        docUrl: "https://docs.kie.ai/market/bytedance/v1-pro-text-to-video.md",
      },
    ],
    "video:bytedance/v1-pro-text-to-video",
  );

  assert.equal(entry?.id, "video:bytedance-v1-pro-text-to-video");
});
