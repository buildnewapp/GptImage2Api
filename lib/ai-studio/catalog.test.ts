import assert from "node:assert/strict";
import test from "node:test";

import {
  findAiStudioCatalogEntryById,
  matchPricingRowsToEntry,
  parseApiDocMarkdown,
  parseLlmsIndex,
} from "@/lib/ai-studio/catalog";

const llmsSample = `
## API Docs
- Image    Models > Google [Google - Nano Banana 2](https://docs.kie.ai/market/google/nanobanana2.md): Image generation by Nano Banana 2
- Video Models > Grok Imagine [Grok Imagine Image to Video](https://docs.kie.ai/market/grok-imagine/image-to-video.md): ## Query Task Status
- Video Models > Bytedance [Bytedance - V1 Pro Text to Video](https://docs.kie.ai/market/bytedance/v1-pro-text-to-video.md): ## Query Task Status
- Chat  Models > GPT [GPT-5-2](https://docs.kie.ai/market/chat/gpt-5-2.md): > GPT-5-2 API
- Veo3.1 API [Generate Veo3.1 Video](https://docs.kie.ai/veo3-api/generate-veo-3-video.md): ::: info[]
- Suno API > Music Generation [Generate Music](https://docs.kie.ai/suno-api/generate-music.md): Generate music with or without lyrics using AI models.
- [Get Task Details](https://docs.kie.ai/market/common/get-task-detail.md): Query the status and results
`;

const apimartLlmsSample = `
# APIMart

## Docs

- [GPT-4o-image Image Generation](https://docs.apimart.ai/en/api-reference/images/gpt-4o/generation.md): - Asynchronous processing mode, returns task ID for subsequent queries
- [Sora2 Video Generation](https://docs.apimart.ai/en/api-reference/videos/sora-2/generation.md): - Asynchronous processing mode, returns task ID for subsequent queries
- [Get Task Status](https://docs.apimart.ai/en/api-reference/tasks/status.md): - Query the execution status and result of an asynchronous task
- [Upload Image](https://docs.apimart.ai/en/api-reference/uploads/images.md): Upload an image to get a URL for use with image/video generation APIs
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

const apimartImageDocSample = `
# GPT-4o-image Image Generation

>  - Asynchronous processing mode, returns task ID for subsequent queries

<RequestExample>
  \`\`\`bash cURL theme={null}
  curl --request POST \\
    --url https://api.apimart.ai/v1/images/generations \\
    --header 'Authorization: Bearer <token>' \\
    --header 'Content-Type: application/json' \\
    --data '{
      "model": "gpt-4o-image",
      "prompt": "An ancient castle under the starry sky",
      "size": "1:1",
      "n": 1,
      "image_urls": ["https://example.com/image.png"]
    }'
  \`\`\`
</RequestExample>

## Authorizations

<ParamField header="Authorization" type="string" required>
  All API endpoints require Bearer Token authentication
</ParamField>

## Body

<ParamField body="model" type="string" default="gpt-4o-image" required>
  Image generation model name

  Example: \`"gpt-4o-image"\`
</ParamField>

<ParamField body="prompt" type="string" required>
  Text description for image generation
</ParamField>

<ParamField body="size" type="string">
  Image generation size
</ParamField>

<ParamField body="n" type="integer">
  Number of images to generate
</ParamField>

<ParamField body="image_urls" type="array">
  Reference image URL list for image-to-image or image editing
</ParamField>
`;

const apimartVideoDocSample = `
# Kling 2.6 Video Generation

> - Async processing mode, returns task ID for subsequent queries

<RequestExample>
  \`\`\`bash cURL theme={null}
  curl --request POST \\
    --url https://api.apimart.ai/v1/videos/generations \\
    --header 'Authorization: Bearer <token>' \\
    --header 'Content-Type: application/json' \\
    --data '{
      "model": "kling-v2-6",
      "prompt": "Waves crashing against rocks",
      "mode": "pro",
      "duration": 10,
      "audio": true,
      "aspect_ratio": "16:9"
    }'
  \`\`\`
</RequestExample>

## Request Parameters

<ParamField body="model" type="string" required>
  Video generation model name

  Supported models:

  * \`kling-v2-6\`
  * \`kling-v2-6-master\`
</ParamField>

<ParamField body="prompt" type="string" required>
  Text prompt
</ParamField>

<ParamField body="mode" type="string" default="std">
  Mode
</ParamField>

<ParamField body="duration" type="integer" default="5">
  Duration
</ParamField>
`;

test("parses the official llms index into supported catalog entries", () => {
  const entries = parseLlmsIndex(llmsSample);

  assert.equal(entries.length, 6);
  assert.deepEqual(
    entries.map((entry) => entry.category),
    ["image", "video", "video", "chat", "video", "music"],
  );
  assert.equal(entries[0]?.title, "Google - Nano Banana 2");
  assert.equal(entries[1]?.docUrl, "https://docs.kie.ai/market/grok-imagine/image-to-video.md");
  assert.equal(entries[2]?.id, "video:bytedance-v1-pro-text-to-video");
  assert.equal(entries[4]?.id, "video:generate-veo3-1-video");
});

test("parses the APIMart llms index into vendor-aware image and video entries", () => {
  const entries = parseLlmsIndex(apimartLlmsSample);

  assert.equal(entries.length, 2);
  assert.deepEqual(
    entries.map((entry) => ({
      id: entry.id,
      category: entry.category,
      vendor: entry.vendor,
    })),
    [
      {
        id: "image:apimart-gpt-4o-image-image-generation",
        category: "image",
        vendor: "apimart",
      },
      {
        id: "video:apimart-sora2-video-generation",
        category: "video",
        vendor: "apimart",
      },
    ],
  );
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

test("parses endpoint, schema, and example payload from an APIMart image doc", () => {
  const detail = parseApiDocMarkdown(
    {
      category: "image",
      title: "GPT-4o-image Image Generation",
      docUrl: "https://docs.apimart.ai/en/api-reference/images/gpt-4o/generation.md",
      provider: "GPT-4o-image",
      vendor: "apimart",
    },
    apimartImageDocSample,
  );

  assert.equal(detail.vendor, "apimart");
  assert.equal(detail.endpoint, "/v1/images/generations");
  assert.equal(detail.method, "POST");
  assert.deepEqual(detail.modelKeys, ["gpt-4o-image"]);
  assert.equal(detail.requestSchema?.properties?.model?.default, "gpt-4o-image");
  assert.equal(detail.requestSchema?.properties?.n?.type, "integer");
  assert.deepEqual(detail.requestSchema?.required, ["model", "prompt"]);
  assert.equal(detail.examplePayload.model, "gpt-4o-image");
  assert.equal(detail.examplePayload.size, "1:1");
});

test("parses supported model enums from an APIMart request-parameters doc", () => {
  const detail = parseApiDocMarkdown(
    {
      category: "video",
      title: "Kling 2.6 Video Generation",
      docUrl: "https://docs.apimart.ai/en/api-reference/videos/kling-v2-6/generation.md",
      provider: "Kling 2.6",
      vendor: "apimart",
    },
    apimartVideoDocSample,
  );

  assert.equal(detail.endpoint, "/v1/videos/generations");
  assert.deepEqual(detail.modelKeys, ["kling-v2-6", "kling-v2-6-master"]);
  assert.deepEqual(detail.requestSchema?.properties?.model?.enum, [
    "kling-v2-6",
    "kling-v2-6-master",
  ]);
  assert.equal(detail.requestSchema?.properties?.mode?.default, "std");
  assert.equal(detail.examplePayload.duration, 10);
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

test("finds canonical bytedance entries from legacy slash-style public ids", () => {
  const entry = findAiStudioCatalogEntryById(
    [
      {
        id: "video:bytedance-v1-pro-text-to-video",
        category: "video",
        title: "Bytedance - V1 Pro Text to Video",
        provider: "Bytedance",
        docUrl: "https://docs.kie.ai/market/bytedance/v1-pro-text-to-video.md",
        pricingRows: [],
      },
    ],
    "video:bytedance/v1-pro-text-to-video",
  );

  assert.equal(entry?.id, "video:bytedance-v1-pro-text-to-video");
});
