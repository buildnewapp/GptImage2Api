import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_VIDEO_STUDIO_FAMILIES,
  getAiVideoStudioVersions,
  resolveAiVideoStudioSelectionFromModelId,
  resolveAiVideoStudioModelId,
} from "@/config/ai-video-studio";

test("exposes the Sora2 family for AI Video Studio", () => {
  assert.equal(
    AI_VIDEO_STUDIO_FAMILIES.some((family) => family.key === "sora2"),
    true,
  );
  assert.equal(
    AI_VIDEO_STUDIO_FAMILIES.some((family) => family.key === "seedance-1.5"),
    true,
  );
  assert.equal(
    AI_VIDEO_STUDIO_FAMILIES.some((family) => family.key === "grok-imagine"),
    true,
  );
  assert.equal(
    AI_VIDEO_STUDIO_FAMILIES.some((family) => family.key === "kling"),
    true,
  );
  assert.equal(
    AI_VIDEO_STUDIO_FAMILIES.some((family) => family.key === "wan"),
    true,
  );
  assert.equal(
    AI_VIDEO_STUDIO_FAMILIES.some((family) => family.key === "hailuo"),
    true,
  );
  assert.equal(
    AI_VIDEO_STUDIO_FAMILIES.some((family) => family.key === "runway"),
    true,
  );
});

test("exposes Grok Imagine as a multi-version family", () => {
  assert.deepEqual(
    getAiVideoStudioVersions("grok-imagine").map((version) => version.key),
    [
      "grok-imagine-text-to-video",
      "grok-imagine-image-to-video",
      "grok-imagine-video-upscale",
      "grok-imagine-video-extend",
    ],
  );
});

test("exposes Veo 3.1 text and image generation variants", () => {
  assert.deepEqual(
    getAiVideoStudioVersions("veo-3.1").map((version) => version.key),
    [
      "veo-3.1-fast-text-to-video",
      "veo-3.1-fast-image-to-video",
      "veo-3.1-quality-text-to-video",
      "veo-3.1-quality-image-to-video",
    ],
  );
});

test("exposes broader KIE video families with older supported variants", () => {
  assert.deepEqual(
    getAiVideoStudioVersions("kling").map((version) => version.key),
    [
      "kling-3.0",
      "kling-3.0-motion-control",
      "kling-2.6-text-to-video",
      "kling-2.6-image-to-video",
      "kling-2.6-motion-control",
      "kling-2.5-turbo-text-to-video-pro",
      "kling-2.5-turbo-image-to-video-pro",
      "kling-v2.1-master-text-to-video",
      "kling-v2.1-master-image-to-video",
      "kling-v2.1-pro",
      "kling-v2.1-standard",
      "kling-ai-avatar-standard",
      "kling-ai-avatar-pro",
    ],
  );
  assert.deepEqual(
    getAiVideoStudioVersions("wan").map((version) => version.key),
    [
      "wan-2.7-text-to-video",
      "wan-2.7-image-to-video",
      "wan-2.7-video-edit",
      "wan-2.7-reference-to-video",
      "wan-2.6-text-to-video",
      "wan-2.6-image-to-video",
      "wan-2.6-video-to-video",
      "wan-2.5-text-to-video",
      "wan-2.5-image-to-video",
      "wan-text-to-video",
      "wan-image-to-video",
      "wan-2.2-a14b-speech-to-video-turbo",
      "wan-animate-move",
      "wan-animate-replace",
    ],
  );
  assert.deepEqual(
    getAiVideoStudioVersions("hailuo").map((version) => version.key),
    [
      "hailuo-standard-text-to-video",
      "hailuo-standard-image-to-video",
      "hailuo-pro-text-to-video",
      "hailuo-pro-image-to-video",
      "hailuo-2.3-standard-image-to-video",
      "hailuo-2.3-pro-image-to-video",
    ],
  );
  assert.deepEqual(
    getAiVideoStudioVersions("runway").map((version) => version.key),
    ["runway-generate-ai-video", "runway-generate-aleph-video"],
  );
});

test("keeps visible family descriptions free of provider branding", () => {
  for (const familyKey of ["grok-imagine", "kling", "wan", "hailuo", "runway"]) {
    const family = AI_VIDEO_STUDIO_FAMILIES.find((item) => item.key === familyKey);
    assert.equal(typeof family?.description, "string");
    assert.equal(family?.description?.toLowerCase().includes("kie"), false);
  }
});

test("keeps versions nested under each family for single-source config management", () => {
  const soraFamily = AI_VIDEO_STUDIO_FAMILIES.find((family) => family.key === "sora2");

  assert.deepEqual(
    soraFamily?.versions.map((version) => version.key),
    [
      "sora-2",
      "sora-2-image-to-video",
      "sora-2-pro",
      "sora-2-pro-image-to-video",
      "sora-2-pro-storyboard",
    ],
  );
});

test("returns the supported Sora2 versions", () => {
  assert.deepEqual(
    getAiVideoStudioVersions("sora2").map((version) => version.key),
    [
      "sora-2",
      "sora-2-image-to-video",
      "sora-2-pro",
      "sora-2-pro-image-to-video",
      "sora-2-pro-storyboard",
    ],
  );
});

test("keeps Seedance 1.0 variants explicit while Seedance 1.5 stays single-entry", () => {
  assert.deepEqual(
    getAiVideoStudioVersions("seedance-1.5").map((version) => version.key),
    ["seedance-1.5"],
  );
  assert.deepEqual(
    getAiVideoStudioVersions("seedance-1.0").map((version) => version.key),
    [
      "seedance-1.0-pro-text-to-video",
      "seedance-1.0-pro-image-to-video",
      "seedance-1.0-lite-text-to-video",
      "seedance-1.0-lite-image-to-video",
      "seedance-1.0-pro-fast-image-to-video",
    ],
  );
});

test("exposes Seedance 2.0 as a selectable family with KIE VIP variants", () => {
  const family = AI_VIDEO_STUDIO_FAMILIES.find((item) => item.key === "seedance-2.0");

  assert.equal(family?.selectable, true);
  assert.deepEqual(
    family?.versions.map((version) => version.key),
    [
      "seedance-2.0",
      "seedance-2.0-fast",
      "seedance-2.0-vip",
      "seedance-2.0-fast-vip",
    ],
  );
});

test("resolves version selections to a single ai-studio public model id", () => {
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "sora2",
      versionKey: "sora-2",
    }),
    "video:sora2-text-to-video-standard",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "sora2",
      versionKey: "sora-2-image-to-video",
    }),
    "video:sora2-image-to-video-standard",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "sora2",
      versionKey: "sora-2-pro-image-to-video",
    }),
    "video:sora2-pro-image-to-video",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "seedance-1.5",
      versionKey: "seedance-1.5",
    }),
    "video:bytedance-seedance-1-5-pro",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "seedance-1.0",
      versionKey: "seedance-1.0-pro-image-to-video",
    }),
    "video:bytedance-v1-pro-image-to-video",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "seedance-1.0",
      versionKey: "seedance-1.0-pro-text-to-video",
    }),
    "video:bytedance-v1-pro-text-to-video",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "seedance-1.0",
      versionKey: "seedance-1.0-lite-image-to-video",
    }),
    "video:bytedance-v1-lite-image-to-video",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "seedance-1.0",
      versionKey: "seedance-1.0-lite-text-to-video",
    }),
    "video:bytedance-v1-lite-text-to-video",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "seedance-1.0",
      versionKey: "seedance-1.0-pro-fast-image-to-video",
    }),
    "video:bytedance-v1-pro-fast-image-to-video",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "seedance-2.0",
      versionKey: "seedance-2.0-vip",
    }),
    "video:seedance-2-0-vip",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "seedance-2.0",
      versionKey: "seedance-2.0",
    }),
    "video:seedance-2-0",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "veo-3.1",
      versionKey: "veo-3.1-fast-text-to-video",
    }),
    "video:veo-3.1-fast-text-to-video",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "grok-imagine",
      versionKey: "grok-imagine-image-to-video",
    }),
    "video:grok-imagine-image-to-video",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "grok-imagine",
      versionKey: "grok-imagine-video-extend",
    }),
    "video:grok-imagine-video-extend",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "kling",
      versionKey: "kling-3.0-motion-control",
    }),
    "video:kling-3-0-motion-control",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "kling",
      versionKey: "kling-2.5-turbo-text-to-video-pro",
    }),
    "video:kling-v2-5-turbo-text-to-video-pro",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "wan",
      versionKey: "wan-2.7-reference-to-video",
    }),
    "video:wan-2-7-reference-to-video",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "wan",
      versionKey: "wan-animate-move",
    }),
    "video:wan-animate-move",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "hailuo",
      versionKey: "hailuo-2.3-standard-image-to-video",
    }),
    "video:hailuo-2-3-standard-image-to-video",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "hailuo",
      versionKey: "hailuo-pro-text-to-video",
    }),
    "video:hailuo-pro-text-to-video",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "runway",
      versionKey: "runway-generate-aleph-video",
    }),
    "video:generate-aleph-video",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "runway",
      versionKey: "runway-generate-ai-video",
    }),
    "video:generate-ai-video",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "grok-imagine",
      versionKey: "grok-imagine-text-to-video",
    }),
    "video:grok-imagine-text-to-video",
  );
});

test("returns null for unsupported selections", () => {
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "missing",
      versionKey: "sora-2",
    }),
    null,
  );
});

test("resolves ai video studio selection metadata from a model id", () => {
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:seedance-2-0"),
    {
      familyKey: "seedance-2.0",
      versionKey: "seedance-2.0",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:apimart-seedance-2-0"),
    {
      familyKey: "seedance-2.0",
      versionKey: "seedance-2.0",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:seedance-2-0-fast-vip"),
    {
      familyKey: "seedance-2.0",
      versionKey: "seedance-2.0-fast-vip",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:kling-3-0-motion-control"),
    {
      familyKey: "kling",
      versionKey: "kling-3.0-motion-control",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:sora2-image-to-video-standard"),
    {
      familyKey: "sora2",
      versionKey: "sora-2-image-to-video",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:sora2-pro-image-to-video"),
    {
      familyKey: "sora2",
      versionKey: "sora-2-pro-image-to-video",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:bytedance-v1-pro-image-to-video"),
    {
      familyKey: "seedance-1.0",
      versionKey: "seedance-1.0-pro-image-to-video",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:bytedance-v1-pro-text-to-video"),
    {
      familyKey: "seedance-1.0",
      versionKey: "seedance-1.0-pro-text-to-video",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:bytedance-seedance-1-5-pro"),
    {
      familyKey: "seedance-1.5",
      versionKey: "seedance-1.5",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:bytedance-v1-lite-image-to-video"),
    {
      familyKey: "seedance-1.0",
      versionKey: "seedance-1.0-lite-image-to-video",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:bytedance-v1-lite-text-to-video"),
    {
      familyKey: "seedance-1.0",
      versionKey: "seedance-1.0-lite-text-to-video",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:bytedance-v1-pro-fast-image-to-video"),
    {
      familyKey: "seedance-1.0",
      versionKey: "seedance-1.0-pro-fast-image-to-video",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:grok-imagine-video-upscale"),
    {
      familyKey: "grok-imagine",
      versionKey: "grok-imagine-video-upscale",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:wan-2-7-reference-to-video"),
    {
      familyKey: "wan",
      versionKey: "wan-2.7-reference-to-video",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:hailuo-standard-image-to-video"),
    {
      familyKey: "hailuo",
      versionKey: "hailuo-standard-image-to-video",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:generate-aleph-video"),
    {
      familyKey: "runway",
      versionKey: "runway-generate-aleph-video",
    },
  );
});
