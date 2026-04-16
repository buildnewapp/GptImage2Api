import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  applyAiStudioSystemFields,
  estimatePricingRow,
  extractMediaUrls,
  extractProviderFailureReason,
  extractTaskId,
  getCanonicalAiStudioModelId,
  mapPublicModelAliasToProviderModel,
  normalizeTaskState,
  prepareAiStudioExecution,
  queryAiStudioTask,
  resolveTaskMode,
  resolveStatusEndpoint,
  submitAiStudioExecution,
} from "@/lib/ai-studio/execute";

test("maps official doc urls to the expected status endpoints", () => {
  assert.equal(
    resolveStatusEndpoint({
      id: "image:nano-banana",
      category: "image",
      title: "Google - Nano Banana 2",
      docUrl: "https://docs.kie.ai/market/google/nanobanana2.md",
      provider: "Google",
      endpoint: "/api/v1/jobs/createTask",
      method: "POST",
      modelKeys: ["google/nano-banana-2"],
      requestSchema: null,
      examplePayload: {},
      pricingRows: [],
    }),
    "/api/v1/jobs/recordInfo",
  );

  assert.equal(
    resolveStatusEndpoint({
      id: "music:generate-music",
      category: "music",
      title: "Generate Music",
      docUrl: "https://docs.kie.ai/suno-api/generate-music.md",
      provider: "Suno",
      endpoint: "/api/v1/generate",
      method: "POST",
      modelKeys: ["V5"],
      requestSchema: null,
      examplePayload: {},
      pricingRows: [],
    }),
    "/api/v1/generate/record-info",
  );
});

test("extracts nested task identifiers from mixed response payloads", () => {
  assert.equal(extractTaskId({ data: { taskId: "task_123" } }), "task_123");
  assert.equal(extractTaskId({ result: { recordId: "record_456" } }), "record_456");
  assert.equal(extractTaskId({ message: "ok" }), null);
});

test("extracts media urls from nested JSON strings like resultJson", () => {
  assert.deepEqual(
    extractMediaUrls({
      code: 200,
      msg: "success",
      data: {
        taskId: "097ff77ea1f25d348da62d0de2c453ab",
        callBackUrl: "http://localhost:3000/api/ai-studio/callback",
        resultJson:
          "{\"resultUrls\":[\"https://tempfile.aiquickdraw.com/r/097ff77ea1f25d348da62d0de2c453ab_1773029425_n07jf415.mp4\"]}",
      },
    }),
    [
      "https://tempfile.aiquickdraw.com/r/097ff77ea1f25d348da62d0de2c453ab_1773029425_n07jf415.mp4",
    ],
  );
});

test("normalizes provider states into the ai studio polling states", () => {
  assert.equal(normalizeTaskState({ data: { state: "waiting" } }), "queued");
  assert.equal(normalizeTaskState({ data: { state: "generating" } }), "running");
  assert.equal(normalizeTaskState({ data: { state: "success" } }), "succeeded");
  assert.equal(normalizeTaskState({ data: { successFlag: 3 } }), "failed");
  assert.equal(
    normalizeTaskState({
      msg: "character_id example_123456789 invalid",
      code: 422,
      data: null,
    }),
    "failed",
  );
});

test("prefers nested failMsg over top-level success messages for failed tasks", () => {
  const raw = {
    msg: "success",
    code: 200,
    data: {
      model: "sora-2-text-to-video",
      state: "fail",
      taskId: "a662a04e8cd906e2d8254059ec91e90b",
      failMsg:
        "Sora official service is currently under heavy load and not responding. Please try again later.",
      failCode: "500",
      progress: 100,
    },
  };

  assert.equal(
    extractProviderFailureReason(raw),
    "Sora official service is currently under heavy load and not responding. Please try again later.",
  );
  assert.equal(normalizeTaskState(raw), "failed");
});

test("treats provider business errors in 200 responses as execution failures", async () => {
  const originalFetch = global.fetch;
  process.env.KIE_API_KEY = "test-key";

  global.fetch = async () =>
    new Response(
      JSON.stringify({
        msg: "character_id example_123456789 invalid",
        code: 422,
        data: null,
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    ) as Response;

  await assert.rejects(
    submitAiStudioExecution(
      {
        id: "video:sora-2-text-to-video",
        category: "video",
        title: "Sora2 - Text to Video",
        docUrl: "https://docs.kie.ai/market/sora2/sora-2-text-to-video.md",
        provider: "Sora2",
        endpoint: "/api/v1/jobs/createTask",
        method: "POST",
        modelKeys: ["sora-2-text-to-video"],
        requestSchema: null,
        examplePayload: {},
        pricingRows: [],
      },
      {
        model: "sora-2-text-to-video",
      },
    ),
    /character_id example_123456789 invalid/,
  );

  global.fetch = originalFetch;
});

test("injects configured callback fields into request payloads", () => {
  const body = applyAiStudioSystemFields(
    {
      id: "video:grok-imagine-text-to-video",
      category: "video",
      title: "Grok Imagine Text to Video",
      docUrl: "https://docs.kie.ai/market/grok-imagine/text-to-video.md",
      provider: "Grok Imagine",
      endpoint: "/api/v1/runway/generate",
      method: "POST",
      modelKeys: ["grok-imagine/text-to-video"],
      requestSchema: {
        type: "object",
        properties: {
          callBackUrl: {
            type: "string",
          },
          progressCallBackUrl: {
            type: "string",
          },
        },
      },
      examplePayload: {},
      pricingRows: [],
    },
    {
      prompt: "hello",
    },
    "https://example.com/api/ai-studio/callback",
  );

  assert.equal(body.callBackUrl, "https://example.com/api/ai-studio/callback");
  assert.equal(body.progressCallBackUrl, "https://example.com/api/ai-studio/callback");
});

test("returns a normalized status mode for async kie executions", async () => {
  const originalFetch = global.fetch;
  process.env.KIE_API_KEY = "test-key";

  global.fetch = async () =>
    new Response(
      JSON.stringify({
        code: 200,
        data: {
          taskId: "task_123",
        },
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    ) as Response;

  const result = await submitAiStudioExecution(
    {
      id: "image:nano-banana",
      category: "image",
      title: "Google - Nano Banana 2",
      docUrl: "https://docs.kie.ai/market/google/nanobanana2.md",
      provider: "Google",
      endpoint: "/api/v1/jobs/createTask",
      method: "POST",
      modelKeys: ["google/nano-banana-2"],
      requestSchema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
          },
        },
      },
      examplePayload: {},
      pricingRows: [],
    },
    {
      model: "google/nano-banana-2",
    },
  );

  assert.equal(result.statusMode, "poll");
  assert.equal(
    resolveTaskMode({
      id: "image:nano-banana",
      category: "image",
      title: "Google - Nano Banana 2",
      docUrl: "https://docs.kie.ai/market/google/nanobanana2.md",
      provider: "Google",
      endpoint: "/api/v1/jobs/createTask",
      method: "POST",
      modelKeys: ["google/nano-banana-2"],
      requestSchema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
          },
        },
      },
      examplePayload: {},
      pricingRows: [],
    }),
    "poll",
  );

  global.fetch = originalFetch;
});

test("does not advertise callback capability when schema has no callback field", () => {
  assert.equal(
    resolveTaskMode({
      id: "image:nano-banana",
      category: "image",
      title: "Google - Nano Banana 2",
      docUrl: "https://docs.kie.ai/market/google/nanobanana2.md",
      provider: "Google",
      endpoint: "/api/v1/jobs/createTask",
      method: "POST",
      modelKeys: ["google/nano-banana-2"],
      requestSchema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
          },
        },
      },
      examplePayload: {},
      pricingRows: [],
    }),
    "poll",
  );

  const body = applyAiStudioSystemFields(
    {
      id: "image:nano-banana",
      category: "image",
      title: "Google - Nano Banana 2",
      docUrl: "https://docs.kie.ai/market/google/nanobanana2.md",
      provider: "Google",
      endpoint: "/api/v1/jobs/createTask",
      method: "POST",
      modelKeys: ["google/nano-banana-2"],
      requestSchema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
          },
        },
      },
      examplePayload: {},
      pricingRows: [],
    },
    {
      prompt: "hello",
    },
    "https://example.com/api/ai-studio/callback",
  );

  assert.equal(body.callBackUrl, "https://example.com/api/ai-studio/callback");
});

test("does not inject legacy kie callback fallback for apimart models", () => {
  const body = applyAiStudioSystemFields(
    {
      id: "video:apimart-seedance-2-0",
      vendor: "apimart",
      category: "video",
      title: "Seedance 2.0",
      docUrl: "https://docs.apimart.ai/en/api-reference/videos/doubao-seedance-2-0/generation",
      provider: "ByteDance",
      endpoint: "/v1/videos/generations",
      statusEndpoint: "/v1/tasks/{taskId}?language=en",
      method: "POST",
      modelKeys: ["doubao-seedance-2.0"],
      requestSchema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
          },
        },
      },
      examplePayload: {},
      pricingRows: [],
    },
    {
      prompt: "hello",
    },
    "https://example.com/api/ai-studio/callback",
  );

  assert.equal("callBackUrl" in body, false);
});

test("submits apimart executions against the apimart base url and extracts task ids", async () => {
  const originalFetch = global.fetch;
  process.env.APIMART_API_KEY = "apimart-test-key";

  let requestUrl = "";
  let authHeader = "";
  global.fetch = async (input, init) => {
    requestUrl = String(input);
    authHeader = String(new Headers(init?.headers).get("authorization"));

    return new Response(
      JSON.stringify({
        code: 200,
        data: [
          {
            status: "submitted",
            task_id: "task_apimart_123",
          },
        ],
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    ) as Response;
  };

  const result = await submitAiStudioExecution(
    {
      id: "video:apimart-seedance-2-0",
      vendor: "apimart",
      category: "video",
      title: "Seedance 2.0",
      docUrl: "https://docs.apimart.ai/en/api-reference/videos/doubao-seedance-2-0/generation",
      provider: "ByteDance",
      endpoint: "/v1/videos/generations",
      statusEndpoint: "/v1/tasks/{taskId}?language=en",
      method: "POST",
      modelKeys: ["doubao-seedance-2.0"],
      requestSchema: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
          },
        },
      },
      examplePayload: {},
      pricingRows: [],
    },
    {
      model: "doubao-seedance-2.0",
      prompt: "hello",
    },
  );

  assert.equal(requestUrl, "https://api.apimart.ai/v1/videos/generations");
  assert.equal(authHeader, "Bearer apimart-test-key");
  assert.equal(result.taskId, "task_apimart_123");
  assert.equal(result.statusMode, "poll");

  global.fetch = originalFetch;
});

test("queries apimart task status using the task path template", async () => {
  const originalFetch = global.fetch;
  const originalRuntimeCatalogPath = process.env.AI_STUDIO_RUNTIME_CATALOG_PATH;
  process.env.APIMART_API_KEY = "apimart-test-key";
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "ai-studio-apimart-runtime-"));
  const runtimePath = path.join(tempDir, "catalog.json");

  await writeFile(
    runtimePath,
    JSON.stringify({
      version: 1,
      generatedAt: "2026-03-08T00:00:00.000Z",
      items: [
        {
          id: "video:apimart-seedance-2-0",
          vendor: "apimart",
          category: "video",
          title: "Seedance 2.0",
          docUrl: "https://docs.apimart.ai/en/api-reference/videos/doubao-seedance-2-0/generation",
          provider: "ByteDance",
          endpoint: "/v1/videos/generations",
          method: "POST",
          statusEndpoint: "/v1/tasks/{taskId}?language=en",
          modelKeys: ["doubao-seedance-2.0"],
          requestSchema: null,
          examplePayload: {},
          pricingRows: [],
        },
      ],
    }),
    "utf8",
  );
  process.env.AI_STUDIO_RUNTIME_CATALOG_PATH = runtimePath;

  let requestUrl = "";
  let authHeader = "";
  global.fetch = async (input, init) => {
    requestUrl = String(input);
    authHeader = String(new Headers(init?.headers).get("authorization"));

    return new Response(
      JSON.stringify({
        code: 200,
        data: {
          id: "task_apimart_123",
          status: "completed",
          result: {
            videos: [
              {
                url: "https://upload.apimart.ai/f/video/final.mp4",
              },
            ],
            thumbnail_url: "https://upload.apimart.ai/f/image/thumb.png",
          },
        },
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    ) as Response;
  };

  const result = await queryAiStudioTask(
    "video:apimart-seedance-2-0",
    "task_apimart_123",
  );

  assert.equal(
    requestUrl,
    "https://api.apimart.ai/v1/tasks/task_apimart_123?language=en",
  );
  assert.equal(authHeader, "Bearer apimart-test-key");
  assert.equal(result.state, "succeeded");
  assert.deepEqual(result.mediaUrls, [
    "https://upload.apimart.ai/f/video/final.mp4",
    "https://upload.apimart.ai/f/image/thumb.png",
  ]);

  global.fetch = originalFetch;
  if (originalRuntimeCatalogPath === undefined) {
    delete process.env.AI_STUDIO_RUNTIME_CATALOG_PATH;
  } else {
    process.env.AI_STUDIO_RUNTIME_CATALOG_PATH = originalRuntimeCatalogPath;
  }
  await rm(tempDir, { recursive: true, force: true });
});

test("prepareAiStudioExecution applies dynamic official pricing for seedance 2.0", async () => {
  const originalRuntimeCatalogPath = process.env.AI_STUDIO_RUNTIME_CATALOG_PATH;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "ai-studio-seedance-pricing-"));
  const runtimePath = path.join(tempDir, "catalog.json");

  await writeFile(
    runtimePath,
    JSON.stringify({
      version: 1,
      generatedAt: "2026-04-12T00:00:00.000Z",
      items: [
        {
          id: "video:apimart-seedance-2-0",
          alias: "seedance-2-0",
          vendor: "apimart",
          category: "video",
          title: "Seedance 2.0",
          docUrl: "https://docs.apimart.ai/en/api-reference/videos/doubao-seedance-2-0/generation",
          provider: "ByteDance",
          endpoint: "/v1/videos/generations",
          method: "POST",
          statusEndpoint: "/v1/tasks/{taskId}?language=en",
          modelKeys: ["doubao-seedance-2.0"],
          requestSchema: {
            type: "object",
            properties: {
              model: { type: "string" },
              resolution: { type: "string" },
              duration: { type: "integer" },
            },
          },
          examplePayload: {
            model: "doubao-seedance-2.0",
          },
          pricingRows: [],
        },
      ],
    }),
    "utf8",
  );
  process.env.AI_STUDIO_RUNTIME_CATALOG_PATH = runtimePath;

  const prepared = await prepareAiStudioExecution("video:seedance-2-0", {
    model: "seedance-2-0",
    resolution: "720p",
    duration: 5,
    video_urls: ["https://example.com/input.mp4"],
    __local_reference_metadata: {
      videoDurationsByUrl: {
        "https://example.com/input.mp4": 8,
      },
    },
  });

  assert.equal(prepared.detail.id, "video:apimart-seedance-2-0");
  assert.equal(prepared.body.model, "doubao-seedance-2.0");
  assert.equal("__local_reference_metadata" in prepared.body, false);
  assert.equal(prepared.selectedPricing?.creditPrice, "325");
  assert.equal(prepared.selectedPricing?.usdPrice, "");
  assert.equal(
    prepared.selectedPricing?.modelDescription,
    "Seedance 2.0, video-to-video, 720p, input 8s + output 5s",
  );

  if (originalRuntimeCatalogPath === undefined) {
    delete process.env.AI_STUDIO_RUNTIME_CATALOG_PATH;
  } else {
    process.env.AI_STUDIO_RUNTIME_CATALOG_PATH = originalRuntimeCatalogPath;
  }
  await rm(tempDir, { recursive: true, force: true });
});

test("prepareAiStudioExecution applies dynamic official pricing for kie seedance 2.0 vip", async () => {
  const originalRuntimeCatalogPath = process.env.AI_STUDIO_RUNTIME_CATALOG_PATH;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "ai-studio-runtime-"));
  const runtimePath = path.join(tempDir, "catalog.json");

  await writeFile(
    runtimePath,
    JSON.stringify({
      version: 1,
      generatedAt: "2026-04-14T00:00:00.000Z",
      items: [
        {
          id: "video:bytedance-seedance-2",
          alias: "seedance-2-0-vip",
          vendor: "kie",
          category: "video",
          title: "Seedance 2.0 VIP",
          docUrl: "https://docs.kie.ai/market/bytedance/seedance-2.md",
          provider: "ByteDance",
          endpoint: "/api/v1/jobs/createTask",
          method: "POST",
          modelKeys: ["bytedance/seedance-2"],
          requestSchema: {
            type: "object",
            properties: {
              model: { type: "string" },
              input: {
                type: "object",
                properties: {
                  resolution: { type: "string" },
                  duration: { type: "integer" },
                  reference_video_urls: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
            },
          },
          examplePayload: {
            model: "bytedance/seedance-2",
            input: {},
          },
          pricingRows: [],
        },
      ],
    }),
    "utf8",
  );
  process.env.AI_STUDIO_RUNTIME_CATALOG_PATH = runtimePath;

  const prepared = await prepareAiStudioExecution("video:seedance-2-0-vip", {
    model: "seedance-2-0-vip",
    input: {
      resolution: "720p",
      duration: 5,
      reference_video_urls: ["https://example.com/input.mp4"],
    },
    __local_reference_metadata: {
      videoDurationsByUrl: {
        "https://example.com/input.mp4": 8,
      },
    },
  });

  assert.equal(prepared.detail.id, "video:bytedance-seedance-2");
  assert.equal(prepared.body.model, "bytedance/seedance-2");
  assert.equal("__local_reference_metadata" in prepared.body, false);
  assert.equal(prepared.selectedPricing?.creditPrice, "325");
  assert.equal(
    prepared.selectedPricing?.modelDescription,
    "Seedance 2.0 VIP, video-to-video, 720p, input 8s + output 5s",
  );

  if (originalRuntimeCatalogPath === undefined) {
    delete process.env.AI_STUDIO_RUNTIME_CATALOG_PATH;
  } else {
    process.env.AI_STUDIO_RUNTIME_CATALOG_PATH = originalRuntimeCatalogPath;
  }
  await rm(tempDir, { recursive: true, force: true });
});

test("estimates the best pricing row from the active payload", () => {
  const row = estimatePricingRow(
    [
      {
        modelDescription: "Google nano banana 2, 1K",
        interfaceType: "image",
        provider: "Google",
        creditPrice: "8",
        creditUnit: "per image",
        usdPrice: "0.04",
        falPrice: "0.08",
        discountRate: 50,
        anchor: "https://kie.ai/nano-banana-2",
        discountPrice: false,
        resolution: "1k",
      },
      {
        modelDescription: "Google nano banana 2, 4K",
        interfaceType: "image",
        provider: "Google",
        creditPrice: "18",
        creditUnit: "per image",
        usdPrice: "0.09",
        falPrice: "0.16",
        discountRate: 43.75,
        anchor: "https://kie.ai/nano-banana-2",
        discountPrice: false,
        resolution: "4k",
      },
    ],
    {
      model: "google/nano-banana-2",
      input: {
        prompt: "A cinematic portrait",
        resolution: "4K",
      },
    },
  );

  assert.equal(row?.creditPrice, "18");
});

test("prefers the exact anchor model when multiple pricing rows share similar tokens", () => {
  const row = estimatePricingRow(
    [
      {
        modelDescription: "Open AI sora 2, text-to-video, stable-10.0s",
        interfaceType: "video",
        provider: "OpenAI",
        creditPrice: "35",
        creditUnit: "per video",
        usdPrice: "0.175",
        falPrice: "1.0",
        discountRate: 82.5,
        anchor: "https://kie.ai/sora-2?model=sora-2-text-to-video-stable",
        discountPrice: false,
        duration: 10,
      },
      {
        modelDescription: "Open AI sora 2, text-to-video, Standard-10.0s",
        interfaceType: "video",
        provider: "OpenAI",
        creditPrice: "30",
        creditUnit: "per video",
        usdPrice: "0.15",
        falPrice: "1.0",
        discountRate: 85,
        anchor: "https://kie.ai/sora-2?model=sora-2-text-to-video",
        discountPrice: false,
        duration: 10,
      },
    ],
    {
      model: "sora-2-text-to-video",
      input: {
        n_frames: "10",
      },
    },
  );

  assert.equal(row?.creditPrice, "30");
});

test("prefers the row matching input n_frames over unrelated digits in payload urls", () => {
  const row = estimatePricingRow(
    [
      {
        modelDescription: "Open AI sora 2, image-to-video, Standard-15.0s",
        interfaceType: "video",
        provider: "OpenAI",
        creditPrice: "35",
        creditUnit: "per video",
        usdPrice: "0.175",
        falPrice: "1.5",
        discountRate: 88.33,
        anchor: "https://kie.ai/sora-2?model=sora-2-image-to-video",
        discountPrice: false,
        duration: 15,
      },
      {
        modelDescription: "Open AI sora 2, image-to-video, Standard-10.0s",
        interfaceType: "video",
        provider: "OpenAI",
        creditPrice: "30",
        creditUnit: "per video",
        usdPrice: "0.15",
        falPrice: "1.0",
        discountRate: 85,
        anchor: "https://kie.ai/sora-2?model=sora-2-image-to-video",
        discountPrice: false,
        duration: 10,
      },
    ],
    {
      model: "sora-2-image-to-video",
      input: {
        n_frames: "10",
        image_urls: [
          "https://example.com/uploads/frame_15_reference.png",
        ],
      },
    },
  );

  assert.equal(row?.creditPrice, "30");
});

test("maps public model aliases back to provider model names before execution", () => {
  const body = mapPublicModelAliasToProviderModel(
    {
      alias: "sdance-text-to-video",
      modelKeys: ["sora-2-text-to-video"],
    },
    {
      model: "sdance-text-to-video",
      input: {
        prompt: "hello",
      },
    },
  );

  assert.equal(body.model, "sora-2-text-to-video");
});

test("resolves public model ids back to canonical runtime catalog ids", () => {
  assert.equal(
    getCanonicalAiStudioModelId(
      [
        {
          id: "video:sora2-text-to-video-standard",
          category: "video",
          alias: "sdance-text-to-video",
        },
      ],
      "video:sdance-text-to-video",
    ),
    "video:sora2-text-to-video-standard",
  );
});

test("falls back from legacy split parent ids to the standard runtime catalog id", () => {
  assert.equal(
    getCanonicalAiStudioModelId(
      [
        {
          id: "video:sora2-text-to-video-standard",
          category: "video",
          alias: null,
        },
        {
          id: "video:sora2-text-to-video-stable",
          category: "video",
          alias: null,
        },
      ],
      "video:sora2-text-to-video",
    ),
    "video:sora2-text-to-video-standard",
  );
});
