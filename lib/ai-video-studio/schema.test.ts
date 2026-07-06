import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeAiVideoStudioFormValues,
  normalizeAiVideoStudioSchema,
} from "@/lib/ai-video-studio/schema";

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
  assert.equal(normalized.fields[4]?.kind, "array");
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

test("uses required non-text fallbacks without prefilling example prompt text", () => {
  const normalized = normalizeAiVideoStudioSchema({
    requestSchema: {
      type: "object",
      properties: {
        input: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
            },
            duration: {
              type: "string",
              enum: ["4", "6", "8", "10"],
            },
            mode: {
              type: "string",
              enum: ["standard", "pro"],
            },
          },
          required: ["prompt", "duration", "mode"],
          "x-apidog-orders": ["prompt", "duration", "mode"],
        },
      },
    },
    examplePayload: {
      input: {
        prompt: "A sample prompt should not prefill the form.",
        duration: "6",
      },
    },
  });

  assert.deepEqual(normalized.defaults, {
    prompt: undefined,
    duration: "6",
    mode: "standard",
  });
});

test("uses false as the fallback for required boolean fields", () => {
  const normalized = normalizeAiVideoStudioSchema({
    requestSchema: {
      type: "object",
      properties: {
        input: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
            },
            generate_audio: {
              type: "boolean",
            },
          },
          required: ["prompt", "generate_audio"],
          "x-apidog-orders": ["prompt", "generate_audio"],
        },
      },
    },
    examplePayload: {
      input: {
        prompt: "A sample prompt should not prefill the form.",
      },
    },
  });

  assert.deepEqual(normalized.defaults, {
    prompt: undefined,
    generate_audio: false,
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

test("forces prompt-like fields to stay required even when upstream schema omits them", () => {
  const normalized = normalizeAiVideoStudioSchema({
    requestSchema: {
      type: "object",
      properties: {
        input: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
            },
            ending_prompt: {
              type: "string",
            },
            negative_prompt: {
              type: "string",
            },
            aspect_ratio: {
              type: "string",
              enum: ["16:9", "9:16"],
            },
          },
        },
      },
    },
    examplePayload: {
      input: {
        prompt: "hello",
      },
    },
  });

  assert.equal(
    normalized.fields.find((field) => field.key === "prompt")?.required,
    true,
  );
  assert.equal(
    normalized.fields.find((field) => field.key === "ending_prompt")?.required,
    true,
  );
  assert.equal(
    normalized.fields.find((field) => field.key === "negative_prompt")?.required,
    false,
  );
  assert.equal(
    normalized.fields.find((field) => field.key === "aspect_ratio")?.required,
    false,
  );
});

test("keeps image url arrays as array fields", () => {
  const normalized = normalizeAiVideoStudioSchema(imageToVideoDetail);

  assert.equal(
    normalized.fields.find((field) => field.key === "image_urls")?.kind,
    "array",
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
    "array",
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

test("applies form ui field order and advanced field grouping overrides", () => {
  const normalized = normalizeAiVideoStudioSchema({
    ...topLevelDetail,
    formUi: {
      fieldOrder: ["duration", "prompt", "aspect_ratio", "image_urls"],
      advancedFields: ["image_urls", "aspect_ratio"],
    },
  });

  assert.deepEqual(
    normalized.fields.map((field) => field.key),
    ["duration", "prompt", "aspect_ratio", "image_urls"],
  );
  assert.deepEqual(
    normalized.primaryFields.map((field) => field.key),
    ["duration", "prompt"],
  );
  assert.deepEqual(
    normalized.advancedFields.map((field) => field.key),
    ["aspect_ratio", "image_urls"],
  );
});

test("hides fields configured by form ui overrides", () => {
  const normalized = normalizeAiVideoStudioSchema({
    requestSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
        },
        max_images: {
          type: "integer",
          default: 1,
        },
        num_images: {
          type: "integer",
          default: 1,
        },
      },
      "x-apidog-orders": ["prompt", "max_images", "num_images"],
    },
    examplePayload: {
      prompt: "hello",
      max_images: 1,
      num_images: 1,
    },
    formUi: {
      hiddenFields: ["max_images"],
    },
  });

  assert.deepEqual(
    normalized.fields.map((field) => field.key),
    ["prompt", "num_images"],
  );
  assert.deepEqual(normalized.defaults, {
    prompt: undefined,
    num_images: 1,
  });
});

test("uses default advanced grouping for boolean and seed fields when no custom form ui exists", () => {
  const normalized = normalizeAiVideoStudioSchema({
    requestSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
        },
        seed: {
          type: "integer",
        },
        remove_watermark: {
          type: "boolean",
        },
      },
      "x-apidog-orders": ["prompt", "seed", "remove_watermark"],
    },
    examplePayload: {
      prompt: "hello",
    },
  });

  assert.equal(normalized.usesDefaultAdvancedGrouping, true);
  assert.deepEqual(
    normalized.primaryFields.map((field) => field.key),
    ["prompt"],
  );
  assert.deepEqual(
    normalized.advancedFields.map((field) => field.key),
    ["seed", "remove_watermark"],
  );
});

test("uses default advanced grouping for seeds and watermark-like fields", () => {
  const normalized = normalizeAiVideoStudioSchema({
    requestSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
        },
        seeds: {
          type: "array",
          items: {
            type: "integer",
          },
        },
        watermark: {
          type: "boolean",
        },
        watermark_text: {
          type: "string",
        },
      },
      "x-apidog-orders": ["prompt", "seeds", "watermark", "watermark_text"],
    },
    examplePayload: {
      prompt: "hello",
    },
  });

  assert.deepEqual(
    normalized.primaryFields.map((field) => field.key),
    ["prompt"],
  );
  assert.deepEqual(
    normalized.advancedFields.map((field) => field.key),
    ["seeds", "watermark", "watermark_text"],
  );
});

test("uses default advanced grouping for bitrate mode and end user id fields", () => {
  const normalized = normalizeAiVideoStudioSchema({
    requestSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
        },
        bitrate_mode: {
          type: "string",
          enum: ["standard", "high"],
        },
        end_user_id: {
          type: "string",
        },
        safety_tolerance: {
          type: "string",
          enum: ["1", "2", "3", "4", "5", "6"],
          default: "4",
        },
      },
      "x-apidog-orders": ["prompt", "bitrate_mode", "end_user_id", "safety_tolerance"],
    },
    examplePayload: {
      prompt: "hello",
    },
  });

  assert.equal(normalized.usesDefaultAdvancedGrouping, true);
  assert.deepEqual(
    normalized.primaryFields.map((field) => field.key),
    ["prompt"],
  );
  assert.deepEqual(
    normalized.advancedFields.map((field) => field.key),
    ["bitrate_mode", "end_user_id", "safety_tolerance"],
  );
});

test("does not force seed and watermark fields into advanced when custom advancedFields are configured", () => {
  const normalized = normalizeAiVideoStudioSchema({
    requestSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
        },
        seed: {
          type: "integer",
        },
        watermark_text: {
          type: "string",
        },
        duration: {
          type: "integer",
        },
      },
      "x-apidog-orders": ["prompt", "seed", "watermark_text", "duration"],
    },
    examplePayload: {
      prompt: "hello",
    },
    formUi: {
      advancedFields: ["duration"],
    },
  });

  assert.equal(normalized.usesDefaultAdvancedGrouping, false);
  assert.deepEqual(
    normalized.primaryFields.map((field) => field.key),
    ["prompt", "seed", "watermark_text"],
  );
  assert.deepEqual(
    normalized.advancedFields.map((field) => field.key),
    ["duration"],
  );
});

test("drops stale enum values that are not supported by the newly selected model", () => {
  const normalized = normalizeAiVideoStudioSchema({
    requestSchema: {
      type: "object",
      properties: {
        input: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
            },
            resolution: {
              type: "string",
              enum: ["720p", "1080p"],
              default: "720p",
            },
            duration: {
              type: "integer",
              enum: [5, 10],
              default: 5,
            },
          },
          required: ["prompt"],
          "x-apidog-orders": ["prompt", "resolution", "duration"],
        },
      },
    },
    examplePayload: {
      input: {
        prompt: "Animate this image",
        resolution: "720p",
        duration: 5,
      },
    },
  });

  assert.deepEqual(
    mergeAiVideoStudioFormValues({
      fields: normalized.fields,
      defaults: normalized.defaults,
      previousValues: {
        prompt: "Animate this image",
        resolution: "480p",
        duration: 10,
      },
    }),
    {
      prompt: "Animate this image",
      resolution: "720p",
      duration: 10,
    },
  );
});

test("removes auto duration when dynamic pricing depends on duration", () => {
  const normalized = normalizeAiVideoStudioSchema({
    requestSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
        },
        duration: {
          type: "string",
          enum: ["auto", "4", "5", "6"],
          default: "auto",
        },
      },
      required: ["prompt"],
      "x-apidog-orders": ["prompt", "duration"],
    },
    examplePayload: {
      prompt: "Generate a video.",
      duration: "auto",
    },
    pricing: {
      price_txt: "480p costs 26.9 credits/s.",
      price_key: "{$input.resolution || $resolution}",
      price_map: {
        "480p": 26.9,
      },
      price_final: "{$price}*{$input.duration || $duration}",
    },
  });

  const durationField = normalized.fields.find(
    (field) => field.key === "duration",
  );

  assert.deepEqual(durationField?.schema.enum, ["4", "5", "6"]);
  assert.equal(durationField?.schema.default, "4");
  assert.equal(durationField?.defaultValue, "4");
  assert.equal(normalized.defaults.duration, "4");
});

test("removes auto duration when dynamic pricing keys depend on duration", () => {
  const normalized = normalizeAiVideoStudioSchema({
    requestSchema: {
      type: "object",
      properties: {
        duration: {
          type: "string",
          enum: ["auto", "8", "12"],
          default: "auto",
        },
        aspect_ratio: {
          type: "string",
          enum: ["16:9", "9:16"],
          default: "16:9",
        },
      },
      "x-apidog-orders": ["duration", "aspect_ratio"],
    },
    examplePayload: {
      duration: "auto",
      aspect_ratio: "16:9",
    },
    pricing: {
      price_key: "{$duration}|{$aspect_ratio}",
      price_map: {
        "8|16:9": 5,
        "12|16:9": 5,
      },
      price_final: "{$price}",
    },
  });

  const durationField = normalized.fields.find(
    (field) => field.key === "duration",
  );

  assert.deepEqual(durationField?.schema.enum, ["8", "12"]);
  assert.equal(normalized.defaults.duration, "8");
});

test("drops stale number values outside the supported range", () => {
  const normalized = normalizeAiVideoStudioSchema({
    requestSchema: {
      type: "object",
      properties: {
        input: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
            },
            duration: {
              type: "integer",
              minimum: 6,
              maximum: 30,
              multipleOf: 1,
              default: 6,
            },
          },
          required: ["prompt"],
          "x-apidog-orders": ["prompt", "duration"],
        },
      },
    },
    examplePayload: {
      input: {
        prompt: "Animate this image",
        duration: 6,
      },
    },
  });

  assert.deepEqual(
    mergeAiVideoStudioFormValues({
      fields: normalized.fields,
      defaults: normalized.defaults,
      previousValues: {
        prompt: "Animate this image",
        duration: "4",
      },
    }),
    {
      prompt: "Animate this image",
      duration: 6,
    },
  );
});

test("wraps cached scalar string values for string array fields", () => {
  const normalized = normalizeAiVideoStudioSchema({
    requestSchema: {
      type: "object",
      properties: {
        input: {
          type: "object",
          properties: {
            image_urls: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
          "x-apidog-orders": ["image_urls"],
        },
      },
    },
    examplePayload: {
      input: {},
    },
  });

  assert.deepEqual(
    mergeAiVideoStudioFormValues({
      fields: normalized.fields,
      defaults: normalized.defaults,
      previousValues: {
        image_urls: "https://example.com/reference.png",
      },
    }),
    {
      image_urls: ["https://example.com/reference.png"],
    },
  );
});

test("maps fal image_size anyOf schemas to image size controls", () => {
  const normalized = normalizeAiVideoStudioSchema({
    requestSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
        },
        image_size: {
          anyOf: [
            {
              title: "ImageSize",
              type: "object",
              properties: {
                width: {
                  type: "integer",
                  default: 512,
                },
                height: {
                  type: "integer",
                  default: 512,
                },
              },
              "x-fal-order-properties": ["width", "height"],
            },
            {
              type: "string",
              enum: [
                "square_hd",
                "landscape_4_3",
                "auto_2K",
              ],
            },
          ],
          default: "auto_2K",
          title: "Image Size",
        },
      },
      "x-apidog-orders": ["prompt", "image_size"],
    },
    examplePayload: {
      prompt: "Edit the image.",
      image_size: "auto_2K",
    },
  });

  const imageSizeField = normalized.fields.find(
    (field) => field.key === "image_size",
  );

  assert.equal(imageSizeField?.kind, "text");
  assert.equal(imageSizeField?.schema["x-ui-control"], "image-size");
  assert.deepEqual(imageSizeField?.schema["x-ui-image-size-options"], [
    {
      label: "Square HD",
      value: "square_hd",
    },
    {
      label: "Landscape 4:3",
      value: "landscape_4_3",
    },
    {
      label: "Auto 2K",
      value: "auto_2K",
    },
    {
      label: "Custom",
      value: "__custom",
      custom: true,
    },
  ]);
  assert.equal(normalized.defaults.image_size, "auto_2K");
});
