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
    mode: "image-to-video",
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
    mode: "image-to-video",
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
    mode: "text-to-video" as const,
    familyKey: "sora2" as const,
    versionKey: "sora-2" as const,
    isPublic: true,
    formValues: {
      prompt: "Persist this",
    },
  };

  assert.equal(
    serializeAiVideoStudioStoredState(state),
    JSON.stringify(state),
  );
  assert.deepEqual(
    safeParseAiVideoStudioStoredState(JSON.stringify(state)),
    state,
  );
  assert.equal(safeParseAiVideoStudioStoredState("{"), null);
  assert.equal(AI_VIDEO_STUDIO_FORM_STORAGE_KEY, "ai-video-studio-form");
});
