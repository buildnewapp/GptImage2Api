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
});

test("returns the supported Sora2 versions", () => {
  assert.deepEqual(
    getAiVideoStudioVersions("sora2").map((version) => version.key),
    ["sora-2", "sora-2-pro"],
  );
});

test("exposes disabled family metadata and tags for non-selectable models", () => {
  const family = AI_VIDEO_STUDIO_FAMILIES.find((item) => item.key === "seedance-2.0");

  assert.equal(family?.selectable, false);
  assert.deepEqual(family?.tags, [
    { text: "Targeted opening", type: "coming-soon" },
  ]);
});

test("resolves Sora2 standard text-to-video to the ai-studio public model id", () => {
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "sora2",
      versionKey: "sora-2",
      mode: "text-to-video",
    }),
    "video:sora2-text-to-video-standard",
  );
});

test("resolves Sora2 standard image-to-video to the ai-studio public model id", () => {
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "sora2",
      versionKey: "sora-2",
      mode: "image-to-video",
    }),
    "video:sora2-image-to-video-standard",
  );
});

test("resolves Sora2 Pro text-to-video to the ai-studio public model id", () => {
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "sora2",
      versionKey: "sora-2-pro",
      mode: "text-to-video",
    }),
    "video:sora2-pro-text-to-video",
  );
});

test("resolves Sora2 Pro image-to-video to the ai-studio public model id", () => {
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "sora2",
      versionKey: "sora-2-pro",
      mode: "image-to-video",
    }),
    "video:sora2-pro-image-to-video",
  );
});

test("returns null for unsupported selections", () => {
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "missing",
      versionKey: "sora-2",
      mode: "text-to-video",
    }),
    null,
  );
});

test("returns null when the configured version does not support the requested mode", () => {
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "seedance-1.5",
      versionKey: "seedance-1.5-fast",
      mode: "text-to-video",
    }),
    null,
  );
});

test("resolves ai video studio selection metadata from a model id", () => {
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:bytedance-v1-pro-image-to-video"),
    {
      familyKey: "seedance-1.5",
      versionKey: "seedance-1.5",
      mode: "image-to-video",
    },
  );
});
