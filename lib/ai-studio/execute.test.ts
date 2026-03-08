import assert from "node:assert/strict";
import test from "node:test";

import {
  estimatePricingRow,
  extractMediaUrls,
  extractProviderFailureReason,
  extractTaskId,
  getCanonicalAiStudioModelId,
  mapPublicModelAliasToProviderModel,
  normalizeTaskState,
  submitAiStudioExecution,
  resolveStatusEndpoint,
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
