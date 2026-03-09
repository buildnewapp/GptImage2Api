import assert from "node:assert/strict";
import test from "node:test";

import { partitionAiVideoStudioFields } from "@/lib/ai-video-studio/fields";

test("keeps prompt, image, aspect ratio, resolution, and duration controls in the primary section", () => {
  const sections = partitionAiVideoStudioFields([
    {
      key: "prompt",
      kind: "prompt",
    },
    {
      key: "image_urls",
      kind: "image",
    },
    {
      key: "aspect_ratio",
      kind: "enum",
    },
    {
      key: "resolution",
      kind: "enum",
    },
    {
      key: "n_frames",
      kind: "enum",
    },
    {
      key: "duration",
      kind: "enum",
    },
    {
      key: "remove_watermark",
      kind: "boolean",
    },
    {
      key: "character_id_list",
      kind: "string-array",
    },
  ]);

  assert.deepEqual(
    sections.primary.map((field) => field.key),
    ["prompt", "image_urls", "aspect_ratio", "resolution", "n_frames", "duration"],
  );
  assert.deepEqual(
    sections.advanced.map((field) => field.key),
    ["remove_watermark", "character_id_list"],
  );
});
