import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_VIDEO_STUDIO_FAMILIES,
  getAiVideoStudioVersions,
  resolveAiVideoStudioModelId,
} from "@/config/ai-video-studio";

test("exposes the Sora2 family for AI Video Studio", () => {
  assert.deepEqual(
    AI_VIDEO_STUDIO_FAMILIES.map((family) => family.key),
    ["sora2"],
  );
});

test("returns the supported Sora2 versions", () => {
  assert.deepEqual(
    getAiVideoStudioVersions("sora2").map((version) => version.key),
    ["sora-2", "sora-2-pro"],
  );
});

test("resolves Sora2 standard text-to-video to the ai-studio public model id", () => {
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "sora2",
      versionKey: "sora-2",
      mode: "text-to-video",
    }),
    "video:sora2-text-to-video",
  );
});

test("resolves Sora2 standard image-to-video to the ai-studio public model id", () => {
  assert.equal(
    resolveAiVideoStudioModelId({
      familyKey: "sora2",
      versionKey: "sora-2",
      mode: "image-to-video",
    }),
    "video:sora2-image-to-video",
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
      familyKey: "missing" as "sora2",
      versionKey: "sora-2",
      mode: "text-to-video",
    }),
    null,
  );
});
