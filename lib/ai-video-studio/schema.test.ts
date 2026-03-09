import assert from "node:assert/strict";
import test from "node:test";

import { normalizeAiVideoStudioSchema } from "@/lib/ai-video-studio/schema";

const textToVideoDetail = {
  requestSchema: {
    type: "object",
    properties: {
      model: {
        type: "string",
      },
      callBackUrl: {
        type: "string",
      },
      progressCallBackUrl: {
        type: "string",
      },
      input: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            maxLength: 10000,
          },
          aspect_ratio: {
            type: "string",
            enum: ["portrait", "landscape"],
            default: "landscape",
          },
          n_frames: {
            type: "string",
            enum: ["10", "15"],
            default: "10",
          },
          remove_watermark: {
            type: "boolean",
          },
          character_id_list: {
            type: "array",
            items: {
              type: "string",
            },
            maxItems: 5,
          },
        },
        required: ["prompt"],
        "x-apidog-orders": [
          "prompt",
          "aspect_ratio",
          "n_frames",
          "remove_watermark",
          "character_id_list",
          "unknown_ref",
        ],
      },
    },
  },
  examplePayload: {
    input: {
      prompt: "A professor stands in front of the class.",
      aspect_ratio: "landscape",
      n_frames: "10",
      remove_watermark: true,
      character_id_list: ["char_1"],
    },
  },
} as const;

const imageToVideoDetail = {
  requestSchema: {
    type: "object",
    properties: {
      input: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
          },
          image_urls: {
            type: "array",
            items: {
              type: "string",
              format: "uri",
            },
            maxItems: 1,
          },
          aspect_ratio: {
            type: "string",
            enum: ["portrait", "landscape"],
          },
        },
        required: ["prompt", "image_urls"],
        "x-apidog-orders": ["prompt", "image_urls", "aspect_ratio"],
      },
    },
  },
  examplePayload: {
    input: {
      prompt: "Animate the reference image.",
      image_urls: ["https://example.com/reference.png"],
      aspect_ratio: "landscape",
    },
  },
} as const;

test("normalizes ai-video-studio fields from the input schema in api order", () => {
  const normalized = normalizeAiVideoStudioSchema(textToVideoDetail);

  assert.deepEqual(
    normalized.fields.map((field) => field.key),
    [
      "prompt",
      "aspect_ratio",
      "n_frames",
      "remove_watermark",
      "character_id_list",
    ],
  );
  assert.equal(normalized.fields[0]?.kind, "prompt");
  assert.equal(normalized.fields[1]?.kind, "enum");
  assert.equal(normalized.fields[2]?.kind, "enum");
  assert.equal(normalized.fields[3]?.kind, "boolean");
  assert.equal(normalized.fields[4]?.kind, "string-array");
});

test("extracts defaults from the example payload and schema metadata", () => {
  const normalized = normalizeAiVideoStudioSchema(textToVideoDetail);

  assert.deepEqual(normalized.defaults, {
    prompt: "A professor stands in front of the class.",
    aspect_ratio: "landscape",
    n_frames: "10",
    remove_watermark: true,
    character_id_list: ["char_1"],
  });
});

test("marks prompt fields as required when the schema requires them", () => {
  const normalized = normalizeAiVideoStudioSchema(textToVideoDetail);

  assert.equal(normalized.requiresPrompt, true);
  assert.equal(
    normalized.fields.find((field) => field.key === "prompt")?.required,
    true,
  );
});

test("detects image requirements from ai studio image-to-video schema", () => {
  const normalized = normalizeAiVideoStudioSchema(imageToVideoDetail);

  assert.equal(normalized.requiresImage, true);
  assert.equal(
    normalized.fields.find((field) => field.key === "image_urls")?.kind,
    "image",
  );
});

test("ignores callback fields outside the input payload", () => {
  const normalized = normalizeAiVideoStudioSchema(textToVideoDetail);

  assert.equal(
    normalized.fields.some((field) => field.key === "callBackUrl"),
    false,
  );
  assert.equal(
    normalized.fields.some((field) => field.key === "progressCallBackUrl"),
    false,
  );
});
