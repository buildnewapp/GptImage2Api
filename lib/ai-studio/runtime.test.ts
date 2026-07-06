import assert from "node:assert/strict";
import test from "node:test";

import {
  getDisplayModelLabel,
  getEstimatedCreditsForPricing,
  resolveDynamicPricing,
  resolveSelectedPricing,
  resolvePublicModelId,
  toBillableCredits,
} from "@/lib/ai-studio/runtime";

test("resolves dynamic pricing from price key, price map, and final expression", () => {
  const row = resolveDynamicPricing(
    {
      docUrl: "https://example.com/video",
      price_txt: "720p with audio costs 20 credits/s; 720p without audio costs 14 credits/s.",
      price_key: "{$resolution}|{$generate_audio ? 'with_audio':'without_audio'}",
      price_map: {
        "720p|with_audio": 20,
        "720p|without_audio": 14,
      },
      price_final: "{$price}*{$duration}",
    },
    {
      resolution: "720p",
      generate_audio: true,
      duration: "5s",
    },
    {
      modelId: "video:test-model",
      title: "Test Model",
      provider: "Test Provider",
      category: "video",
    },
  );

  assert.equal(row?.creditPrice, "100");
  assert.equal(row?.creditUnit, "credits");
  assert.equal(row?.pricingKey, "720p|with_audio");
});

test("resolves seedance 2 dynamic pricing from billing adapter context", () => {
  const row = resolveDynamicPricing(
    {
      docUrl: "https://docs.kie.ai/market/bytedance/seedance-2.md",
      price_txt: "With video = Price * (Input + Output).",
      billing_adapter: "kie_seedance_2",
      price_key: "{$input.resolution}|{$billing.has_video_input ? 'with_video':'no_video'}",
      price_map: {
        "720p|with_video": 25,
        "720p|no_video": 41,
      },
      price_final:
        "{$price}*({$billing.has_video_input ? ($billing.input_video_duration + $input.duration) : $input.duration})",
    },
    {
      input: {
        resolution: "720p",
        duration: "5s",
        reference_video_urls: ["https://example.com/input.mp4"],
      },
      __local_reference_metadata: {
        videoDurationsByUrl: {
          "https://example.com/input.mp4": 8,
        },
      },
    },
    {
      modelId: "video:bytedance-seedance-2",
      title: "Seedance 2.0 VIP",
      provider: "ByteDance",
      category: "video",
    },
  );

  assert.equal(row?.creditPrice, "325");
  assert.equal(row?.pricingKey, "720p|with_video");
  assert.match(row?.modelDescription ?? "", /720p\|with_video/);
});

test("normalizes duration-like string values in pricing expressions", () => {
  const baseConfig = {
    price_key: "default",
    price_map: {
      default: 20,
    },
    price_final: "{$price}*{$duration}",
  };
  const model = {
    modelId: "video:test-model",
    title: "Test Model",
    provider: "Test Provider",
    category: "video",
  };

  assert.equal(
    resolveDynamicPricing(baseConfig, { duration: 8 }, model)?.creditPrice,
    "160",
  );
  assert.equal(
    resolveDynamicPricing(baseConfig, { duration: "8" }, model)?.creditPrice,
    "160",
  );
  assert.equal(
    resolveDynamicPricing(baseConfig, { duration: "8s" }, model)?.creditPrice,
    "160",
  );
});

test("returns null for auto duration", () => {
  const row = resolveDynamicPricing(
    {
      price_key: "default",
      price_map: {
        default: 20,
      },
      price_final: "{$price}*{$duration}",
    },
    {
      duration: "auto",
    },
    {
      modelId: "video:test-model",
      title: "Test Model",
      provider: "Test Provider",
      category: "video",
    },
  );

  assert.equal(row, null);
});

test("normalizes duration-like string values in price key", () => {
  const row = resolveDynamicPricing(
    {
      price_key: "{$input.duration}|{$size}",
      price_map: {
        "8|720p": 12,
      },
      price_final: "{$price}",
    },
    {
      input: {
        duration: "8s",
      },
      size: "720p",
    },
    {
      modelId: "video:test-model",
      title: "Test Model",
      provider: "Test Provider",
      category: "video",
    },
  );

  assert.equal(row?.creditPrice, "12");
  assert.equal(row?.pricingKey, "8|720p");
});

test("normalizes duration-like strings from the fields referenced by pricing expressions", () => {
  const row = resolveDynamicPricing(
    {
      price_key: "{$input.seconds}|{$mode}",
      price_map: {
        "8|fast": 12,
      },
      price_final: "{$price}*{$input.seconds}",
    },
    {
      input: {
        seconds: "8s",
      },
      mode: "fast",
    },
    {
      modelId: "video:test-model",
      title: "Test Model",
      provider: "Test Provider",
      category: "video",
    },
  );

  assert.equal(row?.creditPrice, "96");
  assert.equal(row?.pricingKey, "8|fast");
});

test("normalizes image size values from the fields referenced by pricing expressions", () => {
  const config = {
    price_key: "{$input.image_size}|{$input.quality || 'high'}",
    price_map: {
      "1024x768|high": 29,
      "1024x1024|high": 42.2,
    },
    price_final: "{$price}*({$input.num_images || 1})",
  };
  const model = {
    modelId: "image:test-model",
    title: "Test Image Model",
    provider: "Test Provider",
    category: "image",
  };

  assert.equal(
    resolveDynamicPricing(
      config,
      {
        input: {
          image_size: "1024 x 768",
          quality: "high",
          num_images: 2,
        },
      },
      model,
    )?.creditPrice,
    "58",
  );
  assert.equal(
    resolveDynamicPricing(
      config,
      {
        input: {
          image_size: {
            width: 1024,
            height: 1024,
          },
          quality: "high",
        },
      },
      model,
    )?.pricingKey,
    "1024x1024|high",
  );
});

test("does not require duration when pricing branch does not use it", () => {
  const row = resolveDynamicPricing(
    {
      price_key: "{$has_input ? 'with_input' : $duration}",
      price_map: {
        with_input: 80,
        "8": 50,
      },
      price_final: "{$price}",
    },
    {
      has_input: true,
    },
    {
      modelId: "video:test-model",
      title: "Test Model",
      provider: "Test Provider",
      category: "video",
    },
  );

  assert.equal(row?.creditPrice, "80");
  assert.equal(row?.pricingKey, "with_input");
});

test("seedance 2 returns null for auto output duration", () => {
  const row = resolveDynamicPricing(
    {
      billing_adapter: "kie_seedance_2",
      price_key: "{$input.resolution}|{$billing.has_video_input ? 'with_video':'no_video'}",
      price_map: {
        "720p|with_video": 25,
        "720p|no_video": 41,
      },
      price_final:
        "{$price}*({$billing.has_video_input ? ($billing.input_video_duration + $input.duration) : $input.duration})",
    },
    {
      input: {
        resolution: "720p",
        duration: "auto",
      },
    },
    {
      modelId: "video:bytedance-seedance-2",
      title: "Seedance 2.0 VIP",
      provider: "ByteDance",
      category: "video",
    },
  );

  assert.equal(row, null);
});

test("returns null when seedance 2 has video input without input duration", () => {
  const row = resolveDynamicPricing(
    {
      docUrl: "https://docs.kie.ai/market/bytedance/seedance-2.md",
      price_txt: "With video = Price * (Input + Output).",
      billing_adapter: "kie_seedance_2",
      price_key: "{$input.resolution}|{$billing.has_video_input ? 'with_video':'no_video'}",
      price_map: {
        "720p|with_video": 25,
        "720p|no_video": 41,
      },
      price_final:
        "{$price}*({$billing.has_video_input ? ($billing.input_video_duration + $input.duration) : $input.duration})",
    },
    {
      input: {
        resolution: "720p",
        duration: 5,
        reference_video_urls: ["https://example.com/input.mp4"],
      },
    },
    {
      modelId: "video:bytedance-seedance-2",
      title: "Seedance 2.0 VIP",
      provider: "ByteDance",
      category: "video",
    },
  );

  assert.equal(row, null);
});

test("rounds official decimal credit prices into billable whole credits", () => {
  assert.equal(toBillableCredits("35"), 35);
  assert.equal(toBillableCredits("87.5"), 88);
  assert.equal(toBillableCredits("0"), 0);
});

test("estimates billable credits from resolved dynamic pricing", () => {
  const credits = getEstimatedCreditsForPricing(
    {
      creditPrice: "16.2",
      creditUnit: "credits",
    },
  );

  assert.equal(credits, 17);
});

test("resolveSelectedPricing requires dynamic pricing config", () => {
  const row = resolveSelectedPricing({
    modelId: "video:seedance-2-0",
    payload: {
      model: "seedance-2-0",
      resolution: "720p",
      duration: 5,
    },
  });

  assert.equal(row, null);
});

test("resolveSelectedPricing calculates seedance 2 from dynamic config", () => {
  const row = resolveSelectedPricing({
    modelId: "video:bytedance-seedance-2",
    title: "Seedance 2.0 VIP",
    provider: "ByteDance",
    category: "video",
    payload: {
      input: {
        resolution: "480p",
        duration: 5,
      },
    },
    pricing: {
      docUrl: "https://docs.kie.ai/market/bytedance/seedance-2.md",
      price_txt: "480P no video costs 19 credits/s.",
      billing_adapter: "kie_seedance_2",
      price_key: "{$input.resolution}|{$billing.has_video_input ? 'with_video':'no_video'}",
      price_map: {
        "480p|with_video": 11.5,
        "480p|no_video": 19,
      },
      price_final:
        "{$price}*({$billing.has_video_input ? ($billing.input_video_duration + $input.duration) : $input.duration})",
    },
  });

  assert.equal(row?.creditPrice, "95");
  assert.equal(row?.creditUnit, "credits");
  assert.equal(
    getEstimatedCreditsForPricing(row),
    95,
  );
});

test("seedance 2 ignores incidental numbers inside video input objects", () => {
  const row = resolveDynamicPricing(
    {
      billing_adapter: "kie_seedance_2",
      price_key: "{$input.resolution}|{$billing.has_video_input ? 'with_video':'no_video'}",
      price_map: {
        "720p|with_video": 25,
        "720p|no_video": 41,
      },
      price_final:
        "{$price}*({$billing.has_video_input ? ($billing.input_video_duration + $input.duration) : $input.duration})",
    },
    {
      input: {
        resolution: "720p",
        duration: 5,
        video_input: {
          url: "https://example.com/input.mp4",
          width: 1920,
        },
      },
    },
    {
      modelId: "video:bytedance-seedance-2",
      title: "Seedance 2.0 VIP",
      provider: "ByteDance",
      category: "video",
    },
  );

  assert.equal(row, null);
});

test("dynamic pricing returns null for unknown billing adapters", () => {
  const row = resolveDynamicPricing(
    {
      billing_adapter: "unknown_adapter",
      price_key: "{$unknown_value}",
      price_map: {
        "5": 20,
      },
      price_final: "{$price}",
    },
    {
      duration: 5,
    },
    {
      modelId: "video:test-model",
      title: "Test Model",
      provider: "Test Provider",
      category: "video",
    },
  );

  assert.equal(row, null);
});

test("uses the configured alias when rendering a single model key", () => {
  assert.equal(
    getDisplayModelLabel(
      {
        alias: "sdance-text-to-video",
        modelKeys: ["sora-2-text-to-video"],
      },
      "sora-2-text-to-video",
    ),
    "sdance-text-to-video",
  );
  assert.equal(
    getDisplayModelLabel(
      {
        alias: "sdance-text-to-video",
        modelKeys: ["sora-2-text-to-video"],
      },
      "other-model",
    ),
    "other-model",
  );
});

test("prefers the public detail id over a stale internal selected id", () => {
  assert.equal(
    resolvePublicModelId("video:sora2-text-to-video-standard", {
      id: "video:sdance-text-to-video",
    }),
    "video:sdance-text-to-video",
  );
  assert.equal(
    resolvePublicModelId("video:sdance-text-to-video", null),
    "video:sdance-text-to-video",
  );
});
