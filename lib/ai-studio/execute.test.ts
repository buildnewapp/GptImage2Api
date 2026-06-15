import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  applyAiStudioSystemFields,
  clearAiStudioTaskStatusCacheForTests,
  extractResultArtifacts,
  extractMediaUrls,
  extractProviderFailureReason,
  extractTaskId,
  getAiStudioApiBaseUrl,
  getAiStudioApiKey,
  getCanonicalAiStudioModelId,
  mapPublicModelAliasToProviderModel,
  normalizeTaskState,
  prepareAiStudioExecution,
  queryAiStudioTask,
  resolveTaskMode,
  resolveStatusEndpoint,
  submitAiStudioExecution,
} from "@/lib/ai-studio/execute";

test("resolves fal vendor api key and base url", () => {
  const originalFalApiKey = process.env.FAL_API_KEY;
  process.env.FAL_API_KEY = "fal-test-key";

  try {
    assert.equal(getAiStudioApiKey("fal"), "fal-test-key");
    assert.equal(getAiStudioApiBaseUrl("fal"), "https://queue.fal.run");
  } finally {
    if (originalFalApiKey === undefined) {
      delete process.env.FAL_API_KEY;
    } else {
      process.env.FAL_API_KEY = originalFalApiKey;
    }
  }
});

test("submits fal executions with queue key auth and extracts request ids", async () => {
  const originalFetch = global.fetch;
  const originalFalApiKey = process.env.FAL_API_KEY;
  process.env.FAL_API_KEY = "fal-test-key";

  let requestUrl = "";
  let authHeader = "";
  global.fetch = async (input, init) => {
    requestUrl = String(input);
    authHeader = String(new Headers(init?.headers).get("authorization"));

    return new Response(
      JSON.stringify({
        request_id: "fal_request_123",
        status: "IN_QUEUE",
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
      id: "video:fal-seedance-2-text-to-video",
      vendor: "fal",
      category: "video",
      title: "Seedance 2.0 Text to Video",
      docUrl: "https://fal.ai/models/bytedance/seedance-2.0/text-to-video/api",
      provider: "ByteDance",
      endpoint: "/fal-ai/seedance-2/text-to-video",
      statusEndpoint: "/fal-ai/seedance-2/text-to-video/requests/{request_id}/status",
      method: "POST",
      modelKeys: ["bytedance/seedance-2.0/text-to-video"],
      requestSchema: null,
      examplePayload: {},
    },
    {
      prompt: "hello",
    },
  );

  assert.equal(requestUrl, "https://queue.fal.run/fal-ai/seedance-2/text-to-video");
  assert.equal(authHeader, "Key fal-test-key");
  assert.equal(result.taskId, "fal_request_123");
  assert.equal(result.statusMode, "poll");

  global.fetch = originalFetch;
  if (originalFalApiKey === undefined) {
    delete process.env.FAL_API_KEY;
  } else {
    process.env.FAL_API_KEY = originalFalApiKey;
  }
});

test("queries fal task status using request_id path templates", async () => {
  clearAiStudioTaskStatusCacheForTests();
  const originalFetch = global.fetch;
  const originalFalApiKey = process.env.FAL_API_KEY;
  const originalRuntimeCatalogPath = process.env.AI_STUDIO_RUNTIME_CATALOG_PATH;
  process.env.FAL_API_KEY = "fal-test-key";
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "ai-studio-fal-runtime-"));
  const runtimePath = path.join(tempDir, "catalog.json");

  await writeFile(
    runtimePath,
    JSON.stringify({
      version: 1,
      generatedAt: "2026-06-15T00:00:00.000Z",
      items: [
        {
          id: "video:fal-seedance-2-text-to-video",
          vendor: "fal",
          category: "video",
          title: "Seedance 2.0 Text to Video",
          docUrl: "https://fal.ai/models/bytedance/seedance-2.0/text-to-video/api",
          provider: "ByteDance",
          endpoint: "/fal-ai/seedance-2/text-to-video",
          statusEndpoint: "/fal-ai/seedance-2/text-to-video/requests/{request_id}/status",
          method: "POST",
          modelKeys: ["bytedance/seedance-2.0/text-to-video"],
          requestSchema: null,
          examplePayload: {},
        },
      ],
    }),
    "utf8",
  );
  process.env.AI_STUDIO_RUNTIME_CATALOG_PATH = runtimePath;

  const requestUrls: string[] = [];
  const authHeaders: string[] = [];
  global.fetch = async (input, init) => {
    const requestUrl = String(input);
    requestUrls.push(requestUrl);
    authHeaders.push(String(new Headers(init?.headers).get("authorization")));

    if (requestUrl.endsWith("/status")) {
      return new Response(
        JSON.stringify({
          request_id: "fal_request_123",
          status: "COMPLETED",
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ) as Response;
    }

    return new Response(
      JSON.stringify({
        video: {
          url: "https://v3.fal.media/files/final.mp4",
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
    "video:fal-seedance-2-text-to-video",
    "fal_request_123",
  );

  assert.deepEqual(requestUrls, [
    "https://queue.fal.run/fal-ai/seedance-2/text-to-video/requests/fal_request_123/status",
    "https://queue.fal.run/fal-ai/seedance-2/text-to-video/requests/fal_request_123",
  ]);
  assert.deepEqual(authHeaders, ["Key fal-test-key", "Key fal-test-key"]);
  assert.equal(result.state, "succeeded");
  assert.deepEqual(result.mediaUrls, ["https://v3.fal.media/files/final.mp4"]);

  global.fetch = originalFetch;
  clearAiStudioTaskStatusCacheForTests();
  if (originalFalApiKey === undefined) {
    delete process.env.FAL_API_KEY;
  } else {
    process.env.FAL_API_KEY = originalFalApiKey;
  }
  if (originalRuntimeCatalogPath === undefined) {
    delete process.env.AI_STUDIO_RUNTIME_CATALOG_PATH;
  } else {
    process.env.AI_STUDIO_RUNTIME_CATALOG_PATH = originalRuntimeCatalogPath;
  }
  await rm(tempDir, { recursive: true, force: true });
});

test("returns failed state when fal result query returns provider validation detail", async () => {
  clearAiStudioTaskStatusCacheForTests();
  const originalFetch = global.fetch;
  const originalFalApiKey = process.env.FAL_API_KEY;
  const originalRuntimeCatalogPath = process.env.AI_STUDIO_RUNTIME_CATALOG_PATH;
  process.env.FAL_API_KEY = "fal-test-key";
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "ai-studio-fal-failed-result-"));
  const runtimePath = path.join(tempDir, "catalog.json");

  await writeFile(
    runtimePath,
    JSON.stringify({
      version: 1,
      generatedAt: "2026-06-23T00:00:00.000Z",
      items: [
        {
          id: "image:fal-openai-gpt-image-2",
          vendor: "fal",
          category: "image",
          title: "GPT Image 2",
          docUrl: "https://fal.ai/models/fal-ai/gpt-image-2/api",
          provider: "OpenAI",
          endpoint: "/fal-ai/gpt-image-2",
          statusEndpoint: "/fal-ai/gpt-image-2/requests/{request_id}/status",
          method: "POST",
          modelKeys: ["fal-ai/gpt-image-2"],
          requestSchema: null,
          examplePayload: {},
        },
      ],
    }),
    "utf8",
  );
  process.env.AI_STUDIO_RUNTIME_CATALOG_PATH = runtimePath;

  global.fetch = async (input) => {
    const requestUrl = String(input);
    if (requestUrl.endsWith("/status")) {
      return new Response(
        JSON.stringify({
          request_id: "fal_request_failed",
          status: "COMPLETED",
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ) as Response;
    }

    return new Response(
      JSON.stringify({
        detail: [
          {
            loc: ["body", "prompt"],
            msg: "The content could not be processed because it contained material flagged by a content checker.",
            type: "content_policy_violation",
          },
        ],
      }),
      {
        status: 422,
        headers: {
          "content-type": "application/json",
        },
      },
    ) as Response;
  };

  const result = await queryAiStudioTask(
    "image:fal-openai-gpt-image-2",
    "fal_request_failed",
  );

  assert.equal(result.state, "failed");
  assert.equal(
    extractProviderFailureReason(result.raw),
    "The content could not be processed because it contained material flagged by a content checker.",
  );

  global.fetch = originalFetch;
  clearAiStudioTaskStatusCacheForTests();
  if (originalFalApiKey === undefined) {
    delete process.env.FAL_API_KEY;
  } else {
    process.env.FAL_API_KEY = originalFalApiKey;
  }
  if (originalRuntimeCatalogPath === undefined) {
    delete process.env.AI_STUDIO_RUNTIME_CATALOG_PATH;
  } else {
    process.env.AI_STUDIO_RUNTIME_CATALOG_PATH = originalRuntimeCatalogPath;
  }
  await rm(tempDir, { recursive: true, force: true });
});

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
        param:
          "{\"input\":\"{\\\"image_urls\\\":[\\\"https://v.sdanceai.com/reference-images/20260507/reference.png\\\"]}\"}",
        resultJson:
          "{\"resultUrls\":[\"https://tempfile.aiquickdraw.com/r/097ff77ea1f25d348da62d0de2c453ab_1773029425_n07jf415.mp4\"]}",
      },
    }),
    [
      "https://tempfile.aiquickdraw.com/r/097ff77ea1f25d348da62d0de2c453ab_1773029425_n07jf415.mp4",
    ],
  );
});

test("excludes fal queue control urls from extracted media urls", () => {
  assert.deepEqual(
    extractMediaUrls({
      status: "IN_PROGRESS",
      request_id: "019ef3ca-bf2e-71b2-b3b6-79a8bca90752",
      response_url:
        "https://queue.fal.run/fal-ai/gpt-image-2/requests/019ef3ca-bf2e-71b2-b3b6-79a8bca90752",
      status_url:
        "https://queue.fal.run/fal-ai/gpt-image-2/requests/019ef3ca-bf2e-71b2-b3b6-79a8bca90752/status",
      cancel_url:
        "https://queue.fal.run/fal-ai/gpt-image-2/requests/019ef3ca-bf2e-71b2-b3b6-79a8bca90752/cancel",
      logs: null,
      metrics: {},
    }),
    [],
  );
});

test("extracts only common media file urls from result containers", () => {
  assert.deepEqual(
    extractMediaUrls({
      result: {
        documentation: "https://docs.fal.ai/errors#content_policy_violation",
        page: "https://example.com/generated/result",
        text: "https://cdn.example.com/generated/readme.txt",
        image: "https://cdn.example.com/generated/final.PNG?download=1",
        video: "https://cdn.example.com/generated/final.mp4#preview",
        audio: "https://cdn.example.com/generated/final.MP3",
      },
    }),
    [
      "https://cdn.example.com/generated/final.PNG?download=1",
      "https://cdn.example.com/generated/final.mp4#preview",
      "https://cdn.example.com/generated/final.MP3",
    ],
  );
});

test("extracts configured result artifacts from provider responses", () => {
  const artifacts = extractResultArtifacts(
    {
      code: 200,
      msg: "success",
      data: {
        audioId: "680af8e7ec3e4a2b9eba55e954aa3161",
        name: "hahah",
      },
    },
    {
      resultArtifacts: [
        {
          kind: "audio-id",
          path: "data.audioId",
          labelPath: "data.name",
          targetField: "audio_ids",
        },
      ],
    },
  );

  assert.deepEqual(artifacts, [
    {
      kind: "audio-id",
      value: "680af8e7ec3e4a2b9eba55e954aa3161",
      label: "hahah",
      targetField: "audio_ids",
    },
  ]);
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

test("extracts fal validation detail messages as provider failure reasons", () => {
  const raw = {
    detail: [
      {
        loc: ["body", "prompt"],
        msg: "The content could not be processed because it contained material flagged by a content checker.",
        type: "content_policy_violation",
        url: "https://docs.fal.ai/errors#content_policy_violation",
      },
    ],
  };

  assert.equal(
    extractProviderFailureReason(raw),
    "The content could not be processed because it contained material flagged by a content checker.",
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
      },
      {
        model: "sora-2-text-to-video",
      },
    ),
    /character_id example_123456789 invalid/,
  );

  global.fetch = originalFetch;
});

test("serializes GET execution payloads into query params", async () => {
  const originalFetch = global.fetch;
  process.env.KIE_API_KEY = "test-key";

  let requestUrl = "";
  let requestBody: BodyInit | null | undefined;
  global.fetch = async (input, init) => {
    requestUrl = String(input);
    requestBody = init?.body;

    return new Response(
      JSON.stringify({
        code: 200,
        msg: "success",
        data: {
          resultUrl: "https://tempfile.aiquickdraw.com/p/veo1080.mp4",
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

  const result = await submitAiStudioExecution(
    {
      id: "video:get-veo3-1-1080p-video",
      category: "video",
      title: "Get 1080P Video",
      docUrl: "https://docs.kie.ai/veo3-api/get-veo-3-1080-p-video",
      provider: "Google",
      endpoint: "/api/v1/veo/get-1080p-video",
      method: "GET",
      modelKeys: [],
      requestSchema: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
          },
          index: {
            type: "integer",
          },
        },
      },
      examplePayload: {},
    },
    {
      taskId: "veo_task_abcdef123456",
      index: 0,
    },
  );

  assert.equal(
    requestUrl,
    "https://api.kie.ai/api/v1/veo/get-1080p-video?taskId=veo_task_abcdef123456&index=0",
  );
  assert.equal(requestBody, undefined);
  assert.deepEqual(result.mediaUrls, ["https://tempfile.aiquickdraw.com/p/veo1080.mp4"]);

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
      id: "video:ama-seedance-2-0",
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
      id: "video:ama-seedance-2-0",
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
          id: "video:ama-seedance-2-0",
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
    "video:ama-seedance-2-0",
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

test("deduplicates concurrent task status queries for the same task", async () => {
  clearAiStudioTaskStatusCacheForTests();
  const originalFetch = global.fetch;
  const originalRuntimeCatalogPath = process.env.AI_STUDIO_RUNTIME_CATALOG_PATH;
  process.env.APIMART_API_KEY = "apimart-test-key";
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "ai-studio-task-cache-"));
  const runtimePath = path.join(tempDir, "catalog.json");

  await writeFile(
    runtimePath,
    JSON.stringify({
      version: 1,
      generatedAt: "2026-04-29T00:00:00.000Z",
      items: [
        {
          id: "video:ama-seedance-2-0",
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
        },
      ],
    }),
    "utf8",
  );
  process.env.AI_STUDIO_RUNTIME_CATALOG_PATH = runtimePath;

  let fetchCount = 0;
  global.fetch = async () => {
    fetchCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 25));

    return new Response(
      JSON.stringify({
        code: 200,
        data: {
          id: "task_apimart_123",
          status: "running",
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

  const [first, second] = await Promise.all([
    queryAiStudioTask("video:ama-seedance-2-0", "task_apimart_123"),
    queryAiStudioTask("video:ama-seedance-2-0", "task_apimart_123"),
  ]);

  assert.equal(fetchCount, 1);
  assert.equal(first.state, "running");
  assert.equal(second.state, "running");

  global.fetch = originalFetch;
  clearAiStudioTaskStatusCacheForTests();
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
          id: "video:ama-seedance-2-0",
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
          pricing: {
            docUrl: "https://docs.apimart.ai/en/api-reference/videos/doubao-seedance-2-0/generation",
            price_txt: "720p with video costs 25 credits/s; 720p no video costs 41 credits/s.",
            billing_adapter: "kie_seedance_2",
            price_key: "{$resolution}|{$billing.has_video_input ? 'with_video':'no_video'}",
            price_map: {
              "720p|with_video": 25,
              "720p|no_video": 41,
            },
            price_final:
              "{$price}*({$billing.has_video_input ? ($billing.input_video_duration + $duration) : $duration})",
          },
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

  assert.equal(prepared.detail.id, "video:ama-seedance-2-0");
  assert.equal(prepared.body.model, "doubao-seedance-2.0");
  assert.equal("__local_reference_metadata" in prepared.body, false);
  assert.equal(prepared.selectedPricing?.creditPrice, "325");
  assert.equal(
    prepared.selectedPricing?.modelDescription,
    "Seedance 2.0, 720p|with_video",
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
          pricing: {
            docUrl: "https://docs.kie.ai/market/bytedance/seedance-2.md",
            price_txt: "720p with video costs 25 credits/s; 720p no video costs 41 credits/s.",
            billing_adapter: "kie_seedance_2",
            price_key: "{$input.resolution}|{$billing.has_video_input ? 'with_video':'no_video'}",
            price_map: {
              "720p|with_video": 25,
              "720p|no_video": 41,
            },
            price_final:
              "{$price}*({$billing.has_video_input ? ($billing.input_video_duration + $input.duration) : $input.duration})",
          },
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
    "Seedance 2.0 VIP, 720p|with_video",
  );

  if (originalRuntimeCatalogPath === undefined) {
    delete process.env.AI_STUDIO_RUNTIME_CATALOG_PATH;
  } else {
    process.env.AI_STUDIO_RUNTIME_CATALOG_PATH = originalRuntimeCatalogPath;
  }
  await rm(tempDir, { recursive: true, force: true });
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
