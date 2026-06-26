import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AI_VIDEO_STUDIO_FAMILIES,
  getAiVideoStudioVersions,
  resolveAiVideoStudioSelectionFromModelId,
  resolveAiVideoStudioModelId,
} from "@/config/ai-video-studio";

function falCatalogModelId(endpointId: string) {
  return `video:fal-${endpointId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

function loadFalModelIds() {
  const file = JSON.parse(
    readFileSync("config/ai-studio/upstream/fal-models.json", "utf8"),
  ) as { models: unknown[] };

  return file.models;
}

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
  assert.equal(
    AI_VIDEO_STUDIO_FAMILIES.some((family) => family.key === "nano-banana"),
    true,
  );
  assert.equal(
    AI_VIDEO_STUDIO_FAMILIES.some((family) => family.key === "gpt-image-2"),
    true,
  );
  assert.equal(
    AI_VIDEO_STUDIO_FAMILIES.some((family) => family.key === "seedream-image"),
    true,
  );
  assert.equal(
    AI_VIDEO_STUDIO_FAMILIES.some((family) => family.key === "qwen2-image"),
    true,
  );
  assert.equal(
    AI_VIDEO_STUDIO_FAMILIES.some((family) => family.key === "grok-imagine-image"),
    true,
  );
  assert.equal(
    AI_VIDEO_STUDIO_FAMILIES.some((family) => family.key === "wan-image"),
    true,
  );
});

test("keeps fal upstream model allowlist as endpoint id strings only", () => {
  const modelIds = loadFalModelIds();

  assert.equal(modelIds.length > 0, true);
  assert.equal(
    modelIds.every((modelId) => typeof modelId === "string"),
    true,
  );
});

test("exposes all configured fal video models in AI Video Studio", () => {
  const configuredFalVideoModelIds = loadFalModelIds()
    .filter((modelId): modelId is string => typeof modelId === "string")
    .filter((endpointId) => endpointId.includes("video") || endpointId.startsWith("fal-ai/veo3"))
    .map(falCatalogModelId);

  const missing = configuredFalVideoModelIds.filter(
    (modelId) => !resolveAiVideoStudioSelectionFromModelId(modelId),
  );

  assert.deepEqual(missing, []);
});

test("exposes Grok Imagine as a multi-version family", () => {
  assert.deepEqual(
    getAiVideoStudioVersions("grok-imagine").map((version) => version.key),
    [
      "grok-imagine-text-to-video",
      "grok-imagine-image-to-video",
      "grok-imagine-video-upscale",
      "grok-imagine-video-extend",
      "fal-grok-imagine-text-to-video",
      "fal-grok-imagine-image-to-video",
      "fal-grok-imagine-1.5-image-to-video",
      "fal-grok-imagine-reference-to-video",
      "fal-grok-imagine-video-edit",
    ],
  );
});

test("exposes Veo 3.1 lite, fast, and quality variants", () => {
  assert.deepEqual(
    getAiVideoStudioVersions("veo-3.1").map((version) => version.key),
    [
      "veo-3.1-lite",
      "veo-3.1-fast",
      "veo-3.1-quality",
      "veo-3.1-extend",
      "veo-3.1-get-1080p",
      "veo-3.1-get-4k",
      "fal-veo-3.1",
      "fal-veo-3.1-fast",
      "fal-veo-3.1-image-to-video",
      "fal-veo-3.1-fast-image-to-video",
      "fal-veo-3",
      "fal-veo-3-fast",
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
      "fal-kling-v3-pro-text-to-video",
      "fal-kling-v3-standard-text-to-video",
      "fal-kling-v3-pro-image-to-video",
      "fal-kling-v3-standard-image-to-video",
      "fal-kling-v3-4k-image-to-video",
      "fal-kling-o1-image-to-video",
      "fal-kling-v2.6-pro-text-to-video",
      "fal-kling-v2.6-pro-image-to-video",
      "fal-kling-v2.6-motion-control",
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
      "fal-wan-2.7-text-to-video",
      "fal-wan-2.7-image-to-video",
      "fal-wan-2.7-reference-to-video",
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
      "fal-hailuo-02-standard-text-to-video",
      "fal-hailuo-02-standard-image-to-video",
      "fal-hailuo-02-pro-text-to-video",
      "fal-hailuo-02-pro-image-to-video",
      "fal-hailuo-02-fast-image-to-video",
      "fal-hailuo-2.3-standard-text-to-video",
      "fal-hailuo-2.3-standard-image-to-video",
      "fal-hailuo-2.3-pro-text-to-video",
      "fal-hailuo-2.3-pro-image-to-video",
      "fal-hailuo-2.3-fast-standard-image-to-video",
      "fal-hailuo-2.3-fast-pro-image-to-video",
    ],
  );
  assert.deepEqual(
    getAiVideoStudioVersions("runway").map((version) => version.key),
    ["runway-generate-ai-video", "runway-generate-aleph-video"],
  );
  assert.deepEqual(
    getAiVideoStudioVersions("nano-banana").map((version) => version.key),
    ["nano-banana-pro", "nano-banana-2"],
  );
  assert.deepEqual(
    getAiVideoStudioVersions("gpt-image-2").map((version) => version.key),
    [
      "gpt-image-2-text-to-image",
      "gpt-image-2-image-to-image",
      "ama-gpt-image-2",
      "fal-openai-gpt-image-2",
      "fal-openai-gpt-image-2-edit",
    ],
  );
  assert.deepEqual(
    getAiVideoStudioVersions("seedream-image").map((version) => version.key),
    [
      "seedream-5-lite-text-to-image",
      "seedream-5-lite-image-to-image",
      "seedream-4.5-text-to-image",
      "seedream-4.5-edit",
      "seedream-5-lite-text-to-image-fal",
      "seedream-5-lite-edit-fal",
      "seedream-4.5-text-to-image-fal",
      "seedream-4.5-edit-fal",
    ],
  );
  assert.deepEqual(
    getAiVideoStudioVersions("qwen2-image").map((version) => version.key),
    [
      "qwen2-text-to-image",
      "qwen2-image-edit",
      "qwen2-text-to-image-fal",
      "qwen2-image-edit-fal",
    ],
  );
  assert.deepEqual(
    getAiVideoStudioVersions("grok-imagine-image").map((version) => version.key),
    ["grok-imagine-text-to-image", "grok-imagine-image-to-image"],
  );
  assert.deepEqual(
    getAiVideoStudioVersions("wan-image").map((version) => version.key),
    ["wan-2.7-image", "wan-2.7-image-pro"],
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
      "sora-2-official",
      "fal-sora-2-text-to-video",
      "fal-sora-2-image-to-video",
      "fal-sora-2-pro-text-to-video",
      "fal-sora-2-pro-image-to-video",
      "fal-sora-2-video-remix",
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
      "sora-2-official",
      "fal-sora-2-text-to-video",
      "fal-sora-2-image-to-video",
      "fal-sora-2-pro-text-to-video",
      "fal-sora-2-pro-image-to-video",
      "fal-sora-2-video-remix",
    ],
  );
});

test("keeps Seedance 1.0 variants explicit while Seedance 1.5 includes fal variants", () => {
  assert.deepEqual(
    getAiVideoStudioVersions("seedance-1.5").map((version) => version.key),
    [
      "seedance-1.5",
      "fal-seedance-1.5-pro-text-to-video",
      "fal-seedance-1.5-pro-image-to-video",
    ],
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
      "fal-seedance-2.0-text-to-video",
      "fal-seedance-2.0-fast-text-to-video",
      "fal-seedance-2.0-image-to-video",
      "fal-seedance-2.0-fast-image-to-video",
      "fal-seedance-2.0-reference-to-video",
      "fal-seedance-2.0-fast-reference-to-video",
    ],
  );
});

test("resolves version selections to a single ai-studio model id", () => {
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
      versionKey: "sora-2-pro",
    }),
    "video:sora2-pro-text-to-video",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "sora2",
      versionKey: "sora-2-official",
    }),
    "video:sora2-official",
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
      versionKey: "seedance-2.0",
    }),
    "video:bytedance-seedance-2",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "veo-3.1",
      versionKey: "veo-3.1-fast",
    }),
    "video:veo-3.1-fast",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "veo-3.1",
      versionKey: "veo-3.1-extend",
    }),
    "video:extend-veo3-1-video",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "veo-3.1",
      versionKey: "veo-3.1-get-1080p",
    }),
    "video:get-veo3-1-1080p-video",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "veo-3.1",
      versionKey: "veo-3.1-get-4k",
    }),
    "video:get-veo3-1-4k-video",
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
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "nano-banana",
      versionKey: "nano-banana-pro",
    }),
    "image:google-nano-banana-pro",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "nano-banana",
      versionKey: "nano-banana-2",
    }),
    "image:google-nano-banana-2",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "gpt-image-2",
      versionKey: "gpt-image-2-text-to-image",
    }),
    "image:gpt-image-2-text-to-image",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "gpt-image-2",
      versionKey: "gpt-image-2-image-to-image",
    }),
    "image:gpt-image-2-image-to-image",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "seedream-image",
      versionKey: "seedream-5-lite-text-to-image",
    }),
    "image:seedream5-0-lite-text-to-image",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "seedream-image",
      versionKey: "seedream-5-lite-image-to-image",
    }),
    "image:seedream5-0-lite-image-to-image",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "seedream-image",
      versionKey: "seedream-4.5-text-to-image",
    }),
    "image:seedream4-5-text-to-image",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "seedream-image",
      versionKey: "seedream-4.5-edit",
    }),
    "image:seedream4-5-edit",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "qwen2-image",
      versionKey: "qwen2-text-to-image",
    }),
    "image:qwen2-text-to-image",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "qwen2-image",
      versionKey: "qwen2-image-edit",
    }),
    "image:qwen2-image-edit",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "grok-imagine-image",
      versionKey: "grok-imagine-text-to-image",
    }),
    "image:grok-imagine-text-to-image",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "grok-imagine-image",
      versionKey: "grok-imagine-image-to-image",
    }),
    "image:grok-imagine-image-to-image",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "wan-image",
      versionKey: "wan-2.7-image",
    }),
    "image:wan-2-7-image",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "wan-image",
      versionKey: "wan-2.7-image-pro",
    }),
    "image:wan-2-7-image-pro",
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

test("keeps ai video studio versions free of legacy aliases", () => {
  const versionsWithAliases = AI_VIDEO_STUDIO_FAMILIES.flatMap((family) =>
    family.versions
      .filter((version) => Object.hasOwn(version, "aliases"))
      .map((version) => `${family.key}:${version.key}`),
  );

  assert.deepEqual(versionsWithAliases, []);
});

test("resolves ai video studio selection metadata from a model id", () => {
  assert.equal(
    resolveAiVideoStudioSelectionFromModelId("video:seedance-2-0-fast-vip"),
    null,
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:kling-3-0-motion-control"),
    {
      familyKey: "kling",
      versionKey: "kling-3.0-motion-control",
    },
  );
  assert.equal(
    resolveAiVideoStudioSelectionFromModelId("video:ama-sora-2"),
    null,
  );
  assert.equal(
    resolveAiVideoStudioSelectionFromModelId("video:ama-sora-2-pro"),
    null,
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
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:veo-3.1-lite"),
    {
      familyKey: "veo-3.1",
      versionKey: "veo-3.1-lite",
    },
  );
  assert.equal(
    resolveAiVideoStudioSelectionFromModelId("video:veo-3.1-fast-text-to-video"),
    null,
  );
  assert.equal(
    resolveAiVideoStudioSelectionFromModelId("video:veo-3.1-quality-image-to-video"),
    null,
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:extend-veo3-1-video"),
    {
      familyKey: "veo-3.1",
      versionKey: "veo-3.1-extend",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:get-veo3-1-1080p-video"),
    {
      familyKey: "veo-3.1",
      versionKey: "veo-3.1-get-1080p",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:get-veo3-1-4k-video"),
    {
      familyKey: "veo-3.1",
      versionKey: "veo-3.1-get-4k",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("image:google-nano-banana-pro"),
    {
      familyKey: "nano-banana",
      versionKey: "nano-banana-pro",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("image:gpt-image-2-text-to-image"),
    {
      familyKey: "gpt-image-2",
      versionKey: "gpt-image-2-text-to-image",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("image:gpt-image-2-image-to-image"),
    {
      familyKey: "gpt-image-2",
      versionKey: "gpt-image-2-image-to-image",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("image:seedream5-0-lite-image-to-image"),
    {
      familyKey: "seedream-image",
      versionKey: "seedream-5-lite-image-to-image",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("image:qwen2-text-to-image"),
    {
      familyKey: "qwen2-image",
      versionKey: "qwen2-text-to-image",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("image:grok-imagine-text-to-image"),
    {
      familyKey: "grok-imagine-image",
      versionKey: "grok-imagine-text-to-image",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("image:grok-imagine-image-to-image"),
    {
      familyKey: "grok-imagine-image",
      versionKey: "grok-imagine-image-to-image",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("image:wan-2-7-image-pro"),
    {
      familyKey: "wan-image",
      versionKey: "wan-2.7-image-pro",
    },
  );
});
