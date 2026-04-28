import assert from "node:assert/strict";
import test from "node:test";

import {
  getAiStudioStatusesForLegacyVideoFilter,
  mapAiStudioStatusToLegacyVideoStatus,
  mapAiStudioStoredPayloadToLegacyVideoInput,
  mapAiStudioUserRecordToLegacyVideoHistoryRecord,
} from "@/lib/ai-studio/dashboard-videos";

test("maps ai studio runtime statuses to legacy video dashboard statuses", () => {
  assert.equal(mapAiStudioStatusToLegacyVideoStatus("created"), "pending");
  assert.equal(mapAiStudioStatusToLegacyVideoStatus("queued"), "pending");
  assert.equal(mapAiStudioStatusToLegacyVideoStatus("running"), "pending");
  assert.equal(mapAiStudioStatusToLegacyVideoStatus("submitted"), "pending");
  assert.equal(mapAiStudioStatusToLegacyVideoStatus("succeeded"), "success");
  assert.equal(mapAiStudioStatusToLegacyVideoStatus("failed"), "failed");
});

test("maps legacy dashboard status filters to ai studio runtime statuses", () => {
  assert.equal(getAiStudioStatusesForLegacyVideoFilter("all"), null);
  assert.deepEqual(getAiStudioStatusesForLegacyVideoFilter("pending"), [
    "created",
    "submitted",
    "queued",
    "running",
  ]);
  assert.deepEqual(getAiStudioStatusesForLegacyVideoFilter("success"), [
    "succeeded",
  ]);
  assert.deepEqual(getAiStudioStatusesForLegacyVideoFilter("failed"), [
    "failed",
  ]);
});

test("extracts legacy video dashboard fields from ai studio request payloads", () => {
  const mapped = mapAiStudioStoredPayloadToLegacyVideoInput({
    input: {
      prompt: "Animate this still",
      image_urls: ["https://example.com/reference.png"],
      aspect_ratio: "portrait",
      n_frames: "15",
      seed: 42,
      camera_fixed: true,
      enable_safety_checker: false,
    },
  });

  assert.deepEqual(mapped, {
    prompt: "Animate this still",
    imageUrl: "https://example.com/reference.png",
    imageUrls: ["https://example.com/reference.png"],
    aspectRatio: "portrait",
    duration: "15s",
    seed: "42",
    cameraFixed: true,
    enableSafetyChecker: false,
  });
});

test("preserves multiple reference images and videos from ai studio payloads", () => {
  const mapped = mapAiStudioStoredPayloadToLegacyVideoInput({
    input: {
      prompt: "Use all references",
      image_urls: [
        "https://example.com/reference-1.png",
        "https://example.com/reference-2.png",
      ],
      input_videos: [
        "https://example.com/reference-1.mp4",
        "https://example.com/reference-2.mp4",
      ],
    },
  });

  assert.deepEqual(mapped, {
    prompt: "Use all references",
    imageUrl: "https://example.com/reference-1.png",
    imageUrls: [
      "https://example.com/reference-1.png",
      "https://example.com/reference-2.png",
    ],
    inputVideos: [
      "https://example.com/reference-1.mp4",
      "https://example.com/reference-2.mp4",
    ],
  });
});

test("maps ai studio user history records into the legacy card view shape", () => {
  const record = mapAiStudioUserRecordToLegacyVideoHistoryRecord({
    id: "gen_1",
    category: "video",
    catalogModelId: "video:bytedance-v1-pro-image-to-video",
    title: "Bytedance - V1 Pro Image to Video",
    provider: "Bytedance",
    status: "succeeded",
    providerTaskId: "task_1",
    isPublic: true,
    reservedCredits: 28,
    capturedCredits: 28,
    refundedCredits: 0,
    resultUrls: ["https://example.com/video.mp4"],
    createdAt: new Date("2026-03-09T00:00:00.000Z").toISOString(),
    requestPayload: {
      model: "bytedance/v1-pro-image-to-video",
      input: {
        prompt: "Animate this still",
        image_url: "https://example.com/reference.png",
        duration: "5",
        resolution: "720p",
      },
    },
    responsePayload: {
      task_id: "task_1",
      resultUrls: ["https://example.com/video.mp4"],
      state: "succeeded",
    },
  });

  assert.deepEqual(record, {
    id: "gen_1",
    taskId: "task_1",
    providerTaskId: "task_1",
    category: "video",
    catalogModelId: "video:bytedance-v1-pro-image-to-video",
    model: "bytedance/v1-pro-image-to-video",
    modelLabel: "Bytedance - V1 Pro Image to Video",
    modelKey: "seedance-1.0",
    versionKey: "seedance-1.0-pro-image-to-video",
    status: "success",
    creditsUsed: 28,
    creditsRequired: 28,
    creditsRefunded: false,
    isPublic: true,
    visibilityAvailable: true,
    prompt: "Animate this still",
    uploadedImage: "https://example.com/reference.png",
    uploadedImages: ["https://example.com/reference.png"],
    inputVideos: [],
    resultUrl: "https://example.com/video.mp4",
    resultUrls: ["https://example.com/video.mp4"],
    createdAt: new Date("2026-03-09T00:00:00.000Z").toISOString(),
    mode: "image-to-video",
    requestPayload: {
      model: "bytedance/v1-pro-image-to-video",
      input: {
        prompt: "Animate this still",
        image_url: "https://example.com/reference.png",
        duration: "5",
        resolution: "720p",
      },
    },
    responsePayload: {
      task_id: "task_1",
      resultUrls: ["https://example.com/video.mp4"],
      state: "succeeded",
    },
    providerValues: {
      prompt: "Animate this still",
      imageUrl: "https://example.com/reference.png",
      imageUrls: ["https://example.com/reference.png"],
      resolution: "720p",
      duration: "5s",
    },
  });
});

test("maps multiple showcase references into the legacy card view shape", () => {
  const record = mapAiStudioUserRecordToLegacyVideoHistoryRecord({
    id: "gen_multi_1",
    category: "video",
    catalogModelId: "video:seedance-2-0",
    title: "Seedance 2.0",
    provider: "Seedance 2.0",
    status: "succeeded",
    providerTaskId: null,
    isPublic: true,
    reservedCredits: 0,
    capturedCredits: 0,
    refundedCredits: 0,
    resultUrls: ["https://example.com/video.mp4"],
    createdAt: new Date("2026-03-09T00:00:00.000Z").toISOString(),
    requestPayload: {
      model: "seedance-2-0",
      input: {
        prompt: "Use all references",
        image_urls: [
          "https://example.com/reference-1.png",
          "https://example.com/reference-2.png",
        ],
        input_videos: [
          "https://example.com/reference-1.mp4",
          "https://example.com/reference-2.mp4",
        ],
      },
    },
    responsePayload: null,
  });

  assert.deepEqual(record.uploadedImages, [
    "https://example.com/reference-1.png",
    "https://example.com/reference-2.png",
  ]);
  assert.deepEqual(record.inputVideos, [
    "https://example.com/reference-1.mp4",
    "https://example.com/reference-2.mp4",
  ]);
  assert.deepEqual(record.providerValues?.imageUrls, [
    "https://example.com/reference-1.png",
    "https://example.com/reference-2.png",
  ]);
  assert.deepEqual(record.providerValues?.inputVideos, [
    "https://example.com/reference-1.mp4",
    "https://example.com/reference-2.mp4",
  ]);
});

test("maps ai studio image history records into the shared dashboard card shape", () => {
  const record = mapAiStudioUserRecordToLegacyVideoHistoryRecord({
    id: "gen_image_1",
    category: "image",
    catalogModelId: "image:gpt-image-1",
    title: "GPT Image 1",
    provider: "OpenAI",
    status: "succeeded",
    providerTaskId: null,
    isPublic: false,
    reservedCredits: 10,
    capturedCredits: 10,
    refundedCredits: 0,
    resultUrls: [
      "https://example.com/image-1.png",
      "https://example.com/image-2.png",
      "https://example.com/image-3.png",
    ],
    createdAt: new Date("2026-03-10T00:00:00.000Z").toISOString(),
    requestPayload: {
      model: "gpt-image-1",
      input: {
        prompt: "A cinematic portrait of a robot",
        aspect_ratio: "1:1",
      },
    },
    responsePayload: null,
  });

  assert.deepEqual(record, {
    id: "gen_image_1",
    taskId: "gen_image_1",
    providerTaskId: null,
    category: "image",
    catalogModelId: "image:gpt-image-1",
    model: "gpt-image-1",
    modelLabel: "GPT Image 1",
    status: "success",
    creditsUsed: 10,
    creditsRequired: 10,
    creditsRefunded: false,
    isPublic: false,
    visibilityAvailable: true,
    prompt: "A cinematic portrait of a robot",
    uploadedImages: [],
    inputVideos: [],
    resultUrl: "https://example.com/image-1.png",
    resultUrls: [
      "https://example.com/image-1.png",
      "https://example.com/image-2.png",
      "https://example.com/image-3.png",
    ],
    createdAt: new Date("2026-03-10T00:00:00.000Z").toISOString(),
    requestPayload: {
      model: "gpt-image-1",
      input: {
        prompt: "A cinematic portrait of a robot",
        aspect_ratio: "1:1",
      },
    },
    responsePayload: null,
    providerValues: {
      prompt: "A cinematic portrait of a robot",
      aspectRatio: "1:1",
    },
  });
});
