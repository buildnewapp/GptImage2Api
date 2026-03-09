import assert from "node:assert/strict";
import test from "node:test";

import {
  getAiStudioStatusesForLegacyVideoFilter,
  mapAiStudioAdminRecordToLegacyAdminVideoRecord,
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
    aspectRatio: "portrait",
    duration: "15s",
    seed: "42",
    cameraFixed: true,
    enableSafetyChecker: false,
  });
});

test("maps ai studio user history records into the legacy card view shape", () => {
  const record = mapAiStudioUserRecordToLegacyVideoHistoryRecord({
    id: "gen_1",
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
  });

  assert.deepEqual(record, {
    id: "gen_1",
    taskId: "task_1",
    providerTaskId: "task_1",
    catalogModelId: "video:bytedance-v1-pro-image-to-video",
    model: "bytedance/v1-pro-image-to-video",
    modelLabel: "Bytedance - V1 Pro Image to Video",
    modelKey: "seedance-1.5",
    versionKey: "seedance-1.5",
    status: "success",
    creditsUsed: 28,
    creditsRequired: 28,
    creditsRefunded: false,
    isPublic: true,
    visibilityAvailable: true,
    prompt: "Animate this still",
    uploadedImage: "https://example.com/reference.png",
    resultUrl: "https://example.com/video.mp4",
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
    providerValues: {
      prompt: "Animate this still",
      imageUrl: "https://example.com/reference.png",
      resolution: "720p",
      duration: "5s",
    },
  });
});

test("maps ai studio admin records into the legacy admin table shape", () => {
  const record = mapAiStudioAdminRecordToLegacyAdminVideoRecord({
    id: "gen_2",
    userId: "user_1",
    userEmail: "user@example.com",
    userName: "Video User",
    catalogModelId: "video:sora2-pro-text-to-video",
    title: "Sora 2 Pro",
    providerTaskId: "task_2",
    status: "failed",
    requestPayload: {
      model: "sora-2-pro-text-to-video",
      input: {
        prompt: "Storm over the ocean",
      },
    },
    resultUrls: [],
    reservedCredits: 120,
    refundedCredits: 120,
    createdAt: new Date("2026-03-09T01:00:00.000Z").toISOString(),
  });

  assert.deepEqual(record, {
    id: "gen_2",
    taskId: "task_2",
    userId: "user_1",
    userEmail: "user@example.com",
    userName: "Video User",
    model: "sora-2-pro-text-to-video",
    selectedModel: "Sora 2 Pro",
    status: "failed",
    creditsUsed: 120,
    creditsRefunded: true,
    inputParams: {
      model: "sora-2-pro-text-to-video",
      input: {
        prompt: "Storm over the ocean",
      },
    },
    prompt: "Storm over the ocean",
    resultUrl: null,
    createdAt: new Date("2026-03-09T01:00:00.000Z").toISOString(),
  });
});
