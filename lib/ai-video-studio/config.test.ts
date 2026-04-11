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

test("keeps versions nested under each family for single-source config management", () => {
  const soraFamily = AI_VIDEO_STUDIO_FAMILIES.find((family) => family.key === "sora2");

  assert.deepEqual(
    soraFamily?.versions.map((version) => version.key),
    ["sora-2", "sora-2-pro", "sora-2-pro-storyboard"],
  );
});

test("returns the supported Sora2 versions", () => {
  assert.deepEqual(
    getAiVideoStudioVersions("sora2").map((version) => version.key),
    ["sora-2", "sora-2-pro", "sora-2-pro-storyboard"],
  );
});

test("exposes APIMart Seedance 2.0 as a selectable family", () => {
  const family = AI_VIDEO_STUDIO_FAMILIES.find((item) => item.key === "seedance-2.0");

  assert.equal(family?.selectable, true);
  assert.deepEqual(family?.tags, [{ text: "APIMart", type: "provider" }]);
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
      familyKey: "seedance-2.0",
      versionKey: "seedance-2.0",
    }),
    "video:apimart-seedance-2-0",
  );
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "veo-3.1",
      versionKey: "veo-3.1-fast",
    }),
    "video:veo-3.1-fast-text-to-video",
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
    resolveAiVideoStudioSelectionFromModelId("video:apimart-seedance-2-0"),
    {
      familyKey: "seedance-2.0",
      versionKey: "seedance-2.0",
    },
  );
  assert.deepEqual(
    resolveAiVideoStudioSelectionFromModelId("video:bytedance-v1-pro-fast-image-to-video"),
    {
      familyKey: "seedance-1.5",
      versionKey: "seedance-1.5-fast",
    },
  );
});
