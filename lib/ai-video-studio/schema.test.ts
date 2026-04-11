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

const topLevelDetail = {
  requestSchema: {
    type: "object",
    properties: {
      model: {
        type: "string",
      },
      prompt: {
        type: "string",
      },
      aspect_ratio: {
        type: "string",
        enum: ["16:9", "9:16"],
        default: "16:9",
      },
      duration: {
        type: "integer",
        enum: [4, 8, 12],
        default: 4,
      },
      image_urls: {
        type: "array",
        items: {
          type: "string",
          format: "uri",
        },
      },
    },
    required: ["model", "prompt"],
    "x-apidog-orders": ["prompt", "image_urls", "aspect_ratio", "duration"],
  },
  examplePayload: {
    model: "sora-2-preview",
    prompt: "A waterfall in mist",
    aspect_ratio: "16:9",
    duration: 8,
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
  assert.equal(normalized.fields[0]?.kind, "text");
  assert.equal(normalized.fields[1]?.kind, "enum");
  assert.equal(normalized.fields[2]?.kind, "enum");
  assert.equal(normalized.fields[3]?.kind, "boolean");
  assert.equal(normalized.fields[4]?.kind, "string-array");
});

test("uses schema defaults without prefilling example input values", () => {
  const normalized = normalizeAiVideoStudioSchema(textToVideoDetail);

  assert.deepEqual(normalized.defaults, {
    prompt: undefined,
    aspect_ratio: "landscape",
    n_frames: "10",
    remove_watermark: undefined,
    character_id_list: undefined,
  });
});

test("marks required fields from the schema without semantic field conversion", () => {
  const normalized = normalizeAiVideoStudioSchema(textToVideoDetail);

  assert.equal(
    normalized.fields.find((field) => field.key === "prompt")?.required,
    true,
  );
  assert.equal(
    normalized.fields.find((field) => field.key === "prompt")?.kind,
    "text",
  );
});

test("keeps image url arrays as plain string-array fields", () => {
  const normalized = normalizeAiVideoStudioSchema(imageToVideoDetail);

  assert.equal(
    normalized.fields.find((field) => field.key === "image_urls")?.kind,
    "string-array",
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

test("normalizes top-level ai-studio fields when the schema does not use input", () => {
  const normalized = normalizeAiVideoStudioSchema(topLevelDetail);

  assert.deepEqual(
    normalized.fields.map((field) => field.key),
    ["prompt", "image_urls", "aspect_ratio", "duration"],
  );
  assert.equal(
    normalized.fields.find((field) => field.key === "prompt")?.required,
    true,
  );
  assert.equal(
    normalized.fields.find((field) => field.key === "image_urls")?.kind,
    "string-array",
  );
  assert.equal(
    normalized.fields.find((field) => field.key === "duration")?.kind,
    "enum",
  );
  assert.deepEqual(normalized.defaults, {
    prompt: undefined,
    image_urls: undefined,
    aspect_ratio: "16:9",
    duration: 4,
  });
});
