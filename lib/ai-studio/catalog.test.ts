import assert from "node:assert/strict";
import test from "node:test";

import {
  matchPricingRowsToEntry,
  parseApiDocMarkdown,
  parseLlmsIndex,
} from "@/lib/ai-studio/catalog";

const llmsSample = `
## API Docs
- Image    Models > Google [Google - Nano Banana 2](https://docs.kie.ai/market/google/nanobanana2.md): Image generation by Nano Banana 2
- Video Models > Kling [Kling 2.6 Text to Video](https://docs.kie.ai/market/kling/text-to-video.md): ## Query Task Status
- Video Models > Grok Imagine [Grok Imagine Image to Video](https://docs.kie.ai/market/grok-imagine/image-to-video.md): ## Query Task Status
- Chat  Models > GPT [GPT-5-2](https://docs.kie.ai/market/chat/gpt-5-2.md): > GPT-5-2 API
- Veo3.1 API [Generate Veo3.1 Video](https://docs.kie.ai/veo3-api/generate-veo-3-video.md): ::: info[]
- Suno API > Music Generation [Generate Music](https://docs.kie.ai/suno-api/generate-music.md): Generate music with or without lyrics using AI models.
- [Get Task Details](https://docs.kie.ai/market/common/get-task-detail.md): Query the status and results
`;

const imageDocSample = `
# Google - Nano Banana 2

## OpenAPI Specification

\`\`\`yaml
openapi: 3.0.1
paths:
  /api/v1/jobs/createTask:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                model:
                  type: string
                  enum:
                    - google/nano-banana-2
                  default: google/nano-banana-2
                input:
                  type: object
                  properties:
                    prompt:
                      type: string
                    resolution:
                      type: string
                      enum:
                        - 1K
                        - 2K
                        - 4K
            example:
              model: google/nano-banana-2
              input:
                prompt: A cinematic portrait
                resolution: 4K
\`\`\`
`;

const musicDocSample = `
# Generate Music

## OpenAPI Specification

\`\`\`yaml
openapi: 3.0.1
paths:
  /api/v1/generate:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                model:
                  type: string
                  enum:
                    - V4
                    - V4_5
                    - V5
                customMode:
                  type: boolean
                prompt:
                  type: string
            example:
              model: V5
              customMode: false
              instrumental: false
              prompt: A dreamy city pop song
\`\`\`
`;

test("parses the official llms index into supported catalog entries", () => {
  const entries = parseLlmsIndex(llmsSample);

  assert.equal(entries.length, 6);
  assert.deepEqual(
    entries.map((entry) => entry.category),
    ["image", "video", "video", "chat", "video", "music"],
  );
  assert.equal(entries[0]?.title, "Google - Nano Banana 2");
  assert.equal(entries[1]?.docUrl, "https://docs.kie.ai/market/kling/text-to-video.md");
  assert.equal(entries[2]?.id, "video:grok-imagine-image-to-video");
  assert.equal(entries[4]?.id, "video:generate-veo3-1-video");
});

test("parses endpoint, method, model keys, and example payload from an image doc", () => {
  const detail = parseApiDocMarkdown({
    category: "image",
    title: "Google - Nano Banana 2",
    docUrl: "https://docs.kie.ai/market/google/nanobanana2.md",
  }, imageDocSample);

  assert.equal(detail.endpoint, "/api/v1/jobs/createTask");
  assert.equal(detail.method, "POST");
  assert.deepEqual(detail.modelKeys, ["google/nano-banana-2"]);
  assert.equal(detail.examplePayload.model, "google/nano-banana-2");
  assert.equal(detail.examplePayload.input?.resolution, "4K");
});

test("parses enum-backed model options from a music doc", () => {
  const detail = parseApiDocMarkdown({
    category: "music",
    title: "Generate Music",
    docUrl: "https://docs.kie.ai/suno-api/generate-music.md",
  }, musicDocSample);

  assert.equal(detail.endpoint, "/api/v1/generate");
  assert.deepEqual(detail.modelKeys, ["V4", "V4_5", "V5"]);
  assert.equal(detail.examplePayload.model, "V5");
});

test("matches official pricing rows onto a catalog entry using model aliases", () => {
  const detail = parseApiDocMarkdown({
    category: "image",
    title: "Google - Nano Banana 2",
    docUrl: "https://docs.kie.ai/market/google/nanobanana2.md",
  }, imageDocSample);

  const matches = matchPricingRowsToEntry(detail, [
    {
      modelDescription: "Google nano banana 2, 4K",
      interfaceType: "image",
      provider: "Google",
      creditPrice: "18",
      creditUnit: "per image",
      usdPrice: "0.09",
      falPrice: "0.16",
      discountRate: 43.75,
      anchor: "https://kie.ai/nano-banana-2",
      discountPrice: false,
    },
    {
      modelDescription: "gpt-5-2, Chat, Input",
      interfaceType: "chat",
      provider: "OpenAI",
      creditPrice: "87.5",
      creditUnit: "per million tokens",
      usdPrice: "0.44",
      falPrice: "",
      discountRate: 75,
      anchor: "https://kie.ai/gpt-5-2",
      discountPrice: false,
    },
  ]);

  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.creditPrice, "18");
});

test("narrows sora pricing rows to the same model family and mode", () => {
  const matches = matchPricingRowsToEntry(
    {
      category: "video",
      title: "Sora2 - Text to Video",
      provider: "Sora2",
      docUrl: "https://docs.kie.ai/market/sora2/sora-2-text-to-video.md",
      modelKeys: ["sora-2-text-to-video"],
    },
    [
      {
        modelDescription: "Open AI sora 2, text-to-video, stable-15.0s",
        interfaceType: "video",
        provider: "OpenAI",
        creditPrice: "40",
        creditUnit: "per video",
        usdPrice: "0.2",
        falPrice: "1.0",
        discountRate: 80,
        anchor: "https://kie.ai/sora-2?model=sora-2-text-to-video-stable",
        discountPrice: false,
      },
      {
        modelDescription: "Open AI sora 2, text-to-video, Standard-10.0s",
        interfaceType: "video",
        provider: "OpenAI",
        creditPrice: "30",
        creditUnit: "per video",
        usdPrice: "0.15",
        falPrice: "1.0",
        discountRate: 85,
        anchor: "https://kie.ai/sora-2?model=sora-2-text-to-video",
        discountPrice: false,
      },
      {
        modelDescription: "Open AI sora 2, image-to-video, stable-10.0s",
        interfaceType: "video",
        provider: "OpenAI",
        creditPrice: "35",
        creditUnit: "per video",
        usdPrice: "0.175",
        falPrice: "1.0",
        discountRate: 82.5,
        anchor: "https://kie.ai/sora-2?model=sora-2-image-to-video-stable",
        discountPrice: false,
      },
      {
        modelDescription: "Open AI sora 2 pro, text-to-video, Pro High-10.0s",
        interfaceType: "video",
        provider: "OpenAI",
        creditPrice: "330",
        creditUnit: "per video",
        usdPrice: "1.65",
        falPrice: "5.0",
        discountRate: 67,
        anchor: "https://kie.ai/sora-2-pro?model=sora-2-pro-text-to-video",
        discountPrice: false,
      },
      {
        modelDescription: "Open AI sora 2-watermark-remover",
        interfaceType: "video",
        provider: "OpenAI",
        creditPrice: "10",
        creditUnit: "per removal",
        usdPrice: "0.05",
        falPrice: "",
        discountRate: 0,
        anchor: "https://kie.ai/sora-2?model=sora-watermark-remover",
        discountPrice: false,
      },
    ],
  );

  assert.deepEqual(
    matches.map((row) => row.modelDescription).sort(),
    [
      "Open AI sora 2, text-to-video, Standard-10.0s",
      "Open AI sora 2, text-to-video, stable-15.0s",
    ].sort(),
  );
});

test("narrows sora pricing rows from catalog seed data using the doc slug", () => {
  const matches = matchPricingRowsToEntry(
    {
      category: "video",
      title: "Sora2 - Text to Video",
      provider: "Sora2",
      docUrl: "https://docs.kie.ai/market/sora2/sora-2-text-to-video.md",
    },
    [
      {
        modelDescription: "Open AI sora 2, text-to-video, stable-15.0s",
        interfaceType: "video",
        provider: "OpenAI",
        creditPrice: "40",
        creditUnit: "per video",
        usdPrice: "0.2",
        falPrice: "1.0",
        discountRate: 80,
        anchor: "https://kie.ai/sora-2?model=sora-2-text-to-video-stable",
        discountPrice: false,
      },
      {
        modelDescription: "Open AI sora 2, image-to-video, stable-10.0s",
        interfaceType: "video",
        provider: "OpenAI",
        creditPrice: "35",
        creditUnit: "per video",
        usdPrice: "0.175",
        falPrice: "1.0",
        discountRate: 82.5,
        anchor: "https://kie.ai/sora-2?model=sora-2-image-to-video-stable",
        discountPrice: false,
      },
    ],
  );

  assert.deepEqual(
    matches.map((row) => row.modelDescription),
    ["Open AI sora 2, text-to-video, stable-15.0s"],
  );
});

test("matches grok imagine seed pricing rows to the same family and operation", () => {
  const matches = matchPricingRowsToEntry(
    {
      category: "video",
      title: "Grok Imagine Text to Video",
      provider: "Grok Imagine",
      docUrl: "https://docs.kie.ai/market/grok-imagine/text-to-video.md",
    },
    [
      {
        modelDescription: "grok-imagine, text-to-video, 15s 720p",
        interfaceType: "video",
        provider: "Grok",
        creditPrice: "40",
        creditUnit: "per video",
        usdPrice: "0.20",
        falPrice: "",
        discountRate: 0,
        anchor: "https://kie.ai/grok-imagine?model=grok-imagine%2Ftext-to-video",
        discountPrice: false,
      },
      {
        modelDescription: "grok-imagine, text-to-video, 6s 480p",
        interfaceType: "video",
        provider: "Grok",
        creditPrice: "10",
        creditUnit: "per video",
        usdPrice: "0.05",
        falPrice: "",
        discountRate: 0,
        anchor: "https://kie.ai/grok-imagine?model=grok-imagine%2Ftext-to-video",
        discountPrice: false,
      },
      {
        modelDescription: "grok-imagine, text-to-video, 6.0s 480p",
        interfaceType: "video",
        provider: "Grok",
        creditPrice: "10",
        creditUnit: "per video",
        usdPrice: "0.05",
        falPrice: "",
        discountRate: 0,
        anchor: "https://kie.ai/grok-imagine?model=grok-imagine%2Ftext-to-video",
        discountPrice: false,
      },
      {
        modelDescription: "grok-imagine, image-to-video, 15.0s 480p",
        interfaceType: "video",
        provider: "Grok",
        creditPrice: "30",
        creditUnit: "per video",
        usdPrice: "0.15",
        falPrice: "",
        discountRate: 0,
        anchor: "https://kie.ai/grok-imagine?model=grok-imagine%2Fimage-to-video",
        discountPrice: false,
      },
      {
        modelDescription: "Google veo 3.1, text-to-video, Quality",
        interfaceType: "video",
        provider: "Google",
        creditPrice: "250.0",
        creditUnit: "per video",
        usdPrice: "1.25",
        falPrice: "3.2",
        discountRate: 60.94,
        anchor: "https://kie.ai/veo-3-1",
        discountPrice: false,
      },
      {
        modelDescription: "Runway, text-to-video, 5.0s-720p",
        interfaceType: "video",
        provider: "Runway",
        creditPrice: "12.0",
        creditUnit: "per video",
        usdPrice: "0.06",
        falPrice: "",
        discountRate: 0,
        anchor: "https://kie.ai/runway-api",
        discountPrice: false,
      },
    ],
  );

  assert.deepEqual(
    matches.map((row) => row.modelDescription).sort(),
    [
      "grok-imagine, text-to-video, 15s 720p",
      "grok-imagine, text-to-video, 6s 480p",
    ].sort(),
  );
});

test("keeps pricing rows for generic docs that do not expose a specific model enum", () => {
  const matches = matchPricingRowsToEntry(
    {
      category: "video",
      title: "Generate AI Video",
      provider: "Runway API",
      docUrl: "https://docs.kie.ai/runway-api/generate-ai-video.md",
      modelKeys: ["api"],
    },
    [
      {
        modelDescription: "Runway, text-to-video, 5.0s-720p",
        interfaceType: "video",
        provider: "Runway",
        creditPrice: "40",
        creditUnit: "per video",
        usdPrice: "0.2",
        falPrice: "0.5",
        discountRate: 60,
        anchor: "https://kie.ai/runway?model=runway-duration-5-generate",
        discountPrice: false,
      },
    ],
  );

  assert.equal(matches.length, 1);
});
