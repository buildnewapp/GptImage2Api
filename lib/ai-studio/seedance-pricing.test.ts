import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateSeedanceVideoPricing,
  getSeedancePricingExplanation,
} from "@/lib/ai-studio/seedance-pricing";

test("calculates official credits for seedance 2.0 without video input", () => {
  const pricing = calculateSeedanceVideoPricing({
    model: "video:seedance-2-0-vip",
    payload: {
      duration: 5,
      resolution: "480p",
    },
  });

  assert.deepEqual(pricing, {
    modelDescription: "Seedance 2.0 VIP, text/image-to-video, 480p, 5s",
    creditPrice: "95",
    usdPrice: "",
    billableSeconds: 5,
    rate: 19,
    hasVideoInput: false,
    outputDurationSeconds: 5,
    inputVideoDurationSeconds: 0,
  });
});

test("calculates official credits for seedance 2.0 with video input", () => {
  const pricing = calculateSeedanceVideoPricing({
    model: "video:seedance-2-0",
    payload: {
      duration: 5,
      resolution: "720p",
      input: {
        video_url: "https://example.com/input.mp4",
        video_duration: 8,
      },
    },
  });

  assert.deepEqual(pricing, {
    modelDescription: "Seedance 2.0, video-to-video, 720p, input 8s + output 5s",
    creditPrice: "325",
    usdPrice: "",
    billableSeconds: 13,
    rate: 25,
    hasVideoInput: true,
    outputDurationSeconds: 5,
    inputVideoDurationSeconds: 8,
  });
});

test("calculates official credits for seedance 2.0 fast with video input", () => {
  const pricing = calculateSeedanceVideoPricing({
    model: "video:apimart-seedance-2-0-fast",
    payload: {
      input: {
        duration: 4,
        resolution: "480p",
        video_input: {
          url: "https://example.com/input.mp4",
          duration: 6,
        },
      },
    },
  });

  assert.deepEqual(pricing, {
    modelDescription: "Seedance 2.0 Fast, video-to-video, 480p, input 6s + output 4s",
    creditPrice: "90",
    usdPrice: "",
    billableSeconds: 10,
    rate: 9,
    hasVideoInput: true,
    outputDurationSeconds: 4,
    inputVideoDurationSeconds: 6,
  });
});

test("does not fall back to zero credits when video input has no duration metadata", () => {
  const pricing = calculateSeedanceVideoPricing({
    model: "video:seedance-2-0",
    payload: {
      duration: 5,
      resolution: "720p",
      video_urls: ["https://example.com/input.mp4"],
    },
  });

  assert.deepEqual(pricing, {
    modelDescription: "Seedance 2.0, video-to-video, 720p, output 5s",
    creditPrice: "125",
    usdPrice: "",
    billableSeconds: 5,
    rate: 25,
    hasVideoInput: true,
    outputDurationSeconds: 5,
    inputVideoDurationSeconds: 0,
  });
});

test("builds readable pricing explanation for seedance 2.0 fast", () => {
  const explanation = getSeedancePricingExplanation({
    model: "video:seedance-2-0-fast",
    payload: {
      duration: 4,
      resolution: "480p",
      video_urls: ["https://example.com/input.mp4"],
      __local_reference_metadata: {
        videoDurationsByUrl: {
          "https://example.com/input.mp4": 7.5,
        },
      },
    },
  });

  assert.deepEqual(explanation, {
    modelDescription: "Seedance 2.0 Fast, video-to-video, 480p, input 8s + output 4s",
    creditPrice: "108",
    usdPrice: "",
    billableSeconds: 12,
    rate: 9,
    hasVideoInput: true,
    outputDurationSeconds: 4,
    inputVideoDurationSeconds: 8,
  });
});

test("uses kie reference video urls metadata when calculating seedance 2.0 vip pricing", () => {
  const explanation = getSeedancePricingExplanation({
    model: "video:seedance-2-0-vip",
    payload: {
      input: {
        duration: 5,
        resolution: "720p",
        reference_video_urls: ["https://example.com/input.mp4"],
      },
      __local_reference_metadata: {
        videoDurationsByUrl: {
          "https://example.com/input.mp4": 8,
        },
      },
    },
  });

  assert.deepEqual(explanation, {
    modelDescription: "Seedance 2.0 VIP, video-to-video, 720p, input 8s + output 5s",
    creditPrice: "325",
    usdPrice: "",
    billableSeconds: 13,
    rate: 25,
    hasVideoInput: true,
    outputDurationSeconds: 5,
    inputVideoDurationSeconds: 8,
  });
});

test("does not render zero-second input duration in pricing explanation when metadata is unavailable", () => {
  const explanation = getSeedancePricingExplanation({
    model: "video:seedance-2-0-fast",
    payload: {
      duration: 4,
      resolution: "480p",
      video_urls: ["https://example.com/input.mp4"],
    },
  });

  assert.equal(explanation, null);
});

test("calculates official credits for seedance 2.0 at 1080p without video input", () => {
  const pricing = calculateSeedanceVideoPricing({
    model: "video:seedance-2-0",
    payload: {
      duration: 5,
      resolution: "1080p",
    },
  });

  assert.deepEqual(pricing, {
    modelDescription: "Seedance 2.0, text/image-to-video, 1080p, 5s",
    creditPrice: "510",
    usdPrice: "",
    billableSeconds: 5,
    rate: 102,
    hasVideoInput: false,
    outputDurationSeconds: 5,
    inputVideoDurationSeconds: 0,
  });
});

test("returns null when seedance 2.0 fast payload uses an unsupported resolution", () => {
  const pricing = calculateSeedanceVideoPricing({
    model: "video:seedance-2-0-fast",
    payload: {
      duration: 5,
      resolution: "1080p",
    },
  });

  assert.equal(pricing, null);
});
