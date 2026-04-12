import assert from "node:assert/strict";
import test from "node:test";

import {
  AI_VIDEO_STUDIO_FORM_STORAGE_KEY,
  buildAiVideoStudioPayload,
  restoreAiVideoStudioFormState,
  safeParseAiVideoStudioStoredState,
  serializeAiVideoStudioStoredState,
} from "@/lib/ai-video-studio/adapter";

const detail = {
  examplePayload: {
    model: "sora-2-image-to-video",
    input: {
      prompt: "Default prompt",
      image_urls: ["https://example.com/default.png"],
      aspect_ratio: "landscape",
      n_frames: "10",
      remove_watermark: true,
      character_id_list: ["char_1"],
    },
  },
} as const;

const topLevelDetail = {
  examplePayload: {
    model: "sora-2-preview",
    prompt: "Default prompt",
    aspect_ratio: "16:9",
    duration: 4,
  },
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
      },
      duration: {
        type: "integer",
      },
      image_urls: {
        type: "array",
        items: {
          type: "string",
        },
      },
    },
  },
} as const;

test("builds ai-studio payloads from form values", () => {
  const payload = buildAiVideoStudioPayload({
    detail,
    formValues: {
      prompt: "Animate this still image",
      image_urls: ["https://example.com/custom.png"],
      aspect_ratio: "portrait",
      n_frames: "15",
      remove_watermark: false,
      character_id_list: ["hero_1"],
    },
  });

  assert.deepEqual(payload, {
    model: "sora-2-image-to-video",
    input: {
      prompt: "Animate this still image",
      image_urls: ["https://example.com/custom.png"],
      aspect_ratio: "portrait",
      n_frames: "15",
      remove_watermark: false,
      character_id_list: ["hero_1"],
    },
  });
});

test("omits empty optional fields from the submitted payload", () => {
  const payload = buildAiVideoStudioPayload({
    detail,
    formValues: {
      prompt: "Animate this still image",
      image_urls: ["https://example.com/custom.png"],
      character_id_list: [],
      aspect_ratio: "",
    },
  });

  assert.deepEqual(payload, {
    model: "sora-2-image-to-video",
    input: {
      prompt: "Animate this still image",
      image_urls: ["https://example.com/custom.png"],
    },
  });
});

test("recursively prunes empty values inside array items", () => {
  const payload = buildAiVideoStudioPayload({
    detail,
    formValues: {
      prompt: "Animate this still image",
      image_urls: ["https://example.com/custom.png", ""],
      character_id_list: ["hero_1", ""],
      shots: [
        {
          prompt: "A close-up",
          duration: 4,
        },
        {
          prompt: "",
          duration: "",
        },
      ],
    },
  });

  assert.deepEqual(payload, {
    model: "sora-2-image-to-video",
    input: {
      prompt: "Animate this still image",
      image_urls: ["https://example.com/custom.png"],
      character_id_list: ["hero_1"],
      shots: [
        {
          prompt: "A close-up",
          duration: 4,
        },
      ],
    },
  });
});

test("does not leak example input values into the payload when the form is blank", () => {
  const payload = buildAiVideoStudioPayload({
    detail,
    formValues: {},
  });

  assert.deepEqual(payload, {
    model: "sora-2-image-to-video",
    input: {},
  });
});

test("applies selected ai-studio pricing rows onto the payload", () => {
  const payload = buildAiVideoStudioPayload({
    detail,
    formValues: {
      prompt: "Animate this still image",
      image_urls: ["https://example.com/custom.png"],
      n_frames: "10",
    },
    selectedPricing: {
      modelDescription: "Sdance, image-to-video, Standard-15.0s",
      interfaceType: "video",
      provider: "Sdance",
      creditPrice: "70",
      creditUnit: "per video",
      usdPrice: "0.175",
      falPrice: "1.5",
      discountRate: 88.33,
      discountPrice: false,
      runtimeModel: "sora-2-image-to-video",
    },
  });

  assert.equal(payload.model, "sora-2-image-to-video");
  assert.equal(payload.input.n_frames, "15");
});

test("restores cached form state from an existing ai-studio payload", () => {
  const restored = restoreAiVideoStudioFormState({
    familyKey: "sora2",
    versionKey: "sora-2-pro",
    isPublic: false,
    payload: {
      model: "sora-2-pro-image-to-video",
      input: {
        prompt: "Restore this into the form",
        image_urls: ["https://example.com/reference.png"],
        aspect_ratio: "portrait",
      },
    },
  });

  assert.deepEqual(restored, {
    familyKey: "sora2",
    versionKey: "sora-2-pro",
    isPublic: false,
    formValues: {
      prompt: "Restore this into the form",
      image_urls: ["https://example.com/reference.png"],
      aspect_ratio: "portrait",
    },
  });
});

test("serializes and parses stored ai-video-studio state safely", () => {
  const state = {
    familyKey: "sora2" as const,
    versionKey: "sora-2" as const,
    isPublic: true,
    formValues: {
      prompt: "Persist this",
    },
  };

  assert.equal(serializeAiVideoStudioStoredState(state), JSON.stringify(state));
  assert.deepEqual(
    safeParseAiVideoStudioStoredState(JSON.stringify(state)),
    state,
  );
  assert.equal(safeParseAiVideoStudioStoredState("{"), null);
  assert.equal(AI_VIDEO_STUDIO_FORM_STORAGE_KEY, "ai-video-studio-form");
});

test("builds top-level ai-studio payloads when the schema does not use input", () => {
  const payload = buildAiVideoStudioPayload({
    detail: topLevelDetail,
    formValues: {
      prompt: "Animate a glass city under moonlight",
      aspect_ratio: "9:16",
      duration: 8,
      image_urls: ["https://example.com/reference.png"],
    },
  });

  assert.deepEqual(payload, {
    model: "sora-2-preview",
    prompt: "Animate a glass city under moonlight",
    aspect_ratio: "9:16",
    duration: 8,
    image_urls: ["https://example.com/reference.png"],
  });
});

test("restores cached top-level form state from an existing ai-studio payload", () => {
  const restored = restoreAiVideoStudioFormState({
    familyKey: "sora2",
    versionKey: "sora-2",
    isPublic: true,
    payload: {
      model: "sora-2-preview",
      prompt: "Restore a top-level prompt",
      aspect_ratio: "16:9",
      duration: 12,
    },
  });

  assert.deepEqual(restored, {
    familyKey: "sora2",
    versionKey: "sora-2",
    isPublic: true,
    formValues: {
      prompt: "Restore a top-level prompt",
      aspect_ratio: "16:9",
      duration: 12,
    },
  });
});
