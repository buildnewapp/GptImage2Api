import assert from "node:assert/strict";
import test from "node:test";

import {
  getAiStudioAssetDirectory,
  hasNonR2AiStudioMediaUrls,
  isAiStudioR2AutoUploadEnabled,
  persistAiStudioMediaUrls,
} from "@/lib/ai-studio/assets";

test("maps ai studio categories to stable asset directories", () => {
  assert.equal(getAiStudioAssetDirectory("video"), "video");
  assert.equal(getAiStudioAssetDirectory("image"), "image");
  assert.equal(getAiStudioAssetDirectory("music"), "audio");
  assert.equal(getAiStudioAssetDirectory("chat"), "file");
});

test("treats only explicit truthy env values as enabling auto upload", () => {
  const previous = process.env.R2_FILE_AUTO_UPLOAD;

  process.env.R2_FILE_AUTO_UPLOAD = "true";
  assert.equal(isAiStudioR2AutoUploadEnabled(), true);

  process.env.R2_FILE_AUTO_UPLOAD = "1";
  assert.equal(isAiStudioR2AutoUploadEnabled(), true);

  process.env.R2_FILE_AUTO_UPLOAD = "false";
  assert.equal(isAiStudioR2AutoUploadEnabled(), false);

  process.env.R2_FILE_AUTO_UPLOAD = "0";
  assert.equal(isAiStudioR2AutoUploadEnabled(), false);

  delete process.env.R2_FILE_AUTO_UPLOAD;
  assert.equal(isAiStudioR2AutoUploadEnabled(), false);

  if (previous === undefined) {
    delete process.env.R2_FILE_AUTO_UPLOAD;
  } else {
    process.env.R2_FILE_AUTO_UPLOAD = previous;
  }
});

test("returns provider urls unchanged when auto upload is disabled", async () => {
  const uploadCalls: Array<{ url: string; key: string }> = [];

  const result = await persistAiStudioMediaUrls({
    category: "video",
    mediaUrls: [
      "https://provider.example.com/video.mp4",
      "https://provider.example.com/video-2.mp4",
    ],
    autoUploadEnabled: false,
    uploadExternalUrl: async (url, key) => {
      uploadCalls.push({ url, key });
      return { url: `https://r2.example.com/${key}`, key };
    },
    now: new Date("2026-03-09T08:00:00.000Z"),
  });

  assert.deepEqual(result, [
    "https://provider.example.com/video.mp4",
    "https://provider.example.com/video-2.mp4",
  ]);
  assert.equal(uploadCalls.length, 0);
});

test("uploads provider urls into typed date-based r2 directories", async () => {
  const uploadCalls: Array<{ url: string; key: string }> = [];

  const result = await persistAiStudioMediaUrls({
    category: "music",
    mediaUrls: [
      "https://provider.example.com/audio/theme-song.wav?token=1",
    ],
    autoUploadEnabled: true,
    r2PublicUrl: "https://cdn.example.com",
    uploadExternalUrl: async (url, key) => {
      uploadCalls.push({ url, key });
      return { url: `https://cdn.example.com/${key}`, key };
    },
    now: new Date("2026-03-09T08:00:00.000Z"),
  });

  assert.equal(uploadCalls.length, 1);
  assert.equal(uploadCalls[0]?.url, "https://provider.example.com/audio/theme-song.wav?token=1");
  assert.match(uploadCalls[0]!.key, /^audio\/2026\/03\/09\/.+\.wav$/);
  assert.deepEqual(result, [`https://cdn.example.com/${uploadCalls[0]!.key}`]);
});

test("skips urls that already point at the configured r2 public host", async () => {
  const uploadCalls: Array<{ url: string; key: string }> = [];

  const result = await persistAiStudioMediaUrls({
    category: "image",
    mediaUrls: [
      "https://cdn.example.com/image/2026/03/09/existing.png",
      "https://provider.example.com/generated/fresh.png",
    ],
    autoUploadEnabled: true,
    r2PublicUrl: "https://cdn.example.com/",
    uploadExternalUrl: async (url, key) => {
      uploadCalls.push({ url, key });
      return { url: `https://cdn.example.com/${key}`, key };
    },
    now: new Date("2026-03-09T08:00:00.000Z"),
  });

  assert.equal(uploadCalls.length, 1);
  assert.equal(uploadCalls[0]?.url, "https://provider.example.com/generated/fresh.png");
  assert.match(uploadCalls[0]!.key, /^image\/2026\/03\/09\/.+\.png$/);
  assert.deepEqual(result, [
    "https://cdn.example.com/image/2026/03/09/existing.png",
    `https://cdn.example.com/${uploadCalls[0]!.key}`,
  ]);
});

test("detects provider urls that still need r2 archival", () => {
  assert.equal(
    hasNonR2AiStudioMediaUrls(
      [
        "https://cdn.example.com/image/2026/03/09/existing.png",
        "https://provider.example.com/generated/fresh.png",
      ],
      "https://cdn.example.com/",
    ),
    true,
  );

  assert.equal(
    hasNonR2AiStudioMediaUrls(
      ["https://cdn.example.com/image/2026/03/09/existing.png"],
      "https://cdn.example.com/",
    ),
    false,
  );
});
