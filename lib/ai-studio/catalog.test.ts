import assert from "node:assert/strict";
import test from "node:test";

import {
  findAiStudioCatalogEntryById,
  parseApimartDocMarkdown,
  parseApimartLlmsFull,
  parseApimartLlmsIndex,
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
- [Claude Code + kie.ai Integration Guide](https://docs.kie.ai/2152008m0.md): Integration setup
- [Claude Code 对接 kie.ai 使用指南](https://docs.kie.ai/2151374m0.md): Integration setup
- Suno API > Voice [Suno Voice Generation Callback](https://docs.kie.ai/suno-api/suno-voice-generate-callback.md): Callback payload
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

const apimartFullSample = `
# Sora2 Video Generation
Source: https://docs.apimart.ai/en/api-reference/videos/sora-2/generation

POST https://api.apimart.ai/v1/videos/generations

<ParamField body="model" type="string" required>
  Video generation model name

  Supported models:

  * \`sora-2\` Sora 2 standard
  * \`sora-2-pro\` Sora 2 Pro
</ParamField>

<ParamField body="prompt" type="string" required>
  Text description for video generation
</ParamField>

<ParamField body="duration" type="integer" default="4">
  Supported values: \`4\`, \`8\`, \`12\`, \`16\`, \`20\`
</ParamField>

\`\`\`json theme={null}
{
  "model": "sora-2",
  "prompt": "A waterfall cascading down forming a rainbow",
  "duration": 8
}
\`\`\`

# Query User Balance
Source: https://docs.apimart.ai/en/api-reference/account/user-balance

GET https://api.apimart.ai/v1/user/balance
`;

const apimartIndexSample = `
# APIMart

## Docs

- [GPT-Image-2 Image Generation](https://docs.apimart.ai/en/api-reference/images/gpt-image-2/generation.md): Image generation
- [Query User Balance](https://docs.apimart.ai/en/api-reference/account/user-balance.md): Account balance
`;

const apimartMarkdownSample = `
# GPT-Image-2 Image Generation

<RequestExample>
  \`\`\`bash cURL theme={null}
  curl --request POST \\
    --url https://api.apimart.ai/v1/images/generations \\
    --header 'Authorization: Bearer <token>' \\
    --header 'Content-Type: application/json' \\
    --data '{
      "model": "gpt-image-2",
      "prompt": "A ginger cat",
      "image_urls": ["https://example.com/photo.jpg"],
      "n": 1
    }'
  \`\`\`
</RequestExample>

<ParamField body="model" type="string" default="gpt-image-2" required>
  Image generation model name

  Fixed to \`gpt-image-2\`
</ParamField>

<ParamField body="prompt" type="string" required>
  Text description for image generation
</ParamField>

<ParamField body="image_urls" type="array">
  Reference image array. Switches to image-to-image mode when provided.
</ParamField>

<ParamField body="n" type="integer" default="1">
  Number of images to generate
  Range: 1
</ParamField>

<ParamField body="official_fallback" type="boolean" default="false">
  Whether to fall back to the official channel
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

test("parses apimart llms-full sections into model catalog details", () => {
  const catalog = parseApimartLlmsFull(apimartFullSample);

  assert.equal(catalog.items.length, 2);
  assert.deepEqual(
    catalog.items.map((item) => item.id),
    ["video:fal-sora-2", "video:fal-sora-2-pro"],
  );
  assert.equal(catalog.items[0]?.vendor, "apimart");
  assert.equal(catalog.items[0]?.endpoint, "/v1/videos/generations");
  assert.equal(catalog.items[0]?.statusEndpoint, "/v1/tasks/{taskId}?language=en");
  assert.deepEqual(catalog.items[1]?.modelKeys, ["sora-2-pro"]);
  assert.deepEqual(catalog.items[1]?.requestSchema?.properties?.model?.enum, [
    "sora-2-pro",
  ]);
  assert.equal(catalog.items[1]?.examplePayload.model, "sora-2-pro");
});

test("parses apimart llms index and markdown docs with body fields", () => {
  const seeds = parseApimartLlmsIndex(apimartIndexSample);

  assert.deepEqual(seeds, [
    {
      title: "GPT-Image-2 Image Generation",
      docUrl: "https://docs.apimart.ai/en/api-reference/images/gpt-image-2/generation.md",
    },
  ]);

  const details = parseApimartDocMarkdown(
    seeds[0]!.title,
    seeds[0]!.docUrl,
    apimartMarkdownSample,
  );

  assert.equal(details.length, 1);
  assert.equal(details[0]?.id, "image:fal-gpt-image-2");
  assert.equal(
    details[0]?.docUrl,
    "https://docs.apimart.ai/en/api-reference/images/gpt-image-2/generation",
  );
  assert.equal(details[0]?.requestSchema?.properties?.image_urls?.type, "array");
  assert.equal(details[0]?.requestSchema?.properties?.n, undefined);
  assert.equal(details[0]?.requestSchema?.properties?.official_fallback?.type, "boolean");
  assert.equal(details[0]?.requestSchema?.properties?.official_fallback?.default, false);
  assert.equal("n" in details[0]!.examplePayload, false);
  assert.deepEqual(details[0]?.requestSchema?.required, ["model", "prompt"]);
});

test("normalizes apimart media url arrays with incomplete item schemas", () => {
  const details = parseApimartDocMarkdown(
    "Gemini-3.1-Flash Image Generation",
    "https://docs.apimart.ai/en/api-reference/images/gemini-3.1-flash/generation.md",
    `
# Gemini-3.1-Flash Image Generation

POST https://api.apimart.ai/v1/images/generations

<ParamField body="model" type="string" default="gemini-3.1-flash-image-preview" required>
  Image generation model name
  Supported models:
  * \`gemini-3.1-flash-image-preview\`
</ParamField>

<ParamField body="prompt" type="string">
  Text prompt
</ParamField>

<ParamField body="image_urls" type="array">
  Reference image URL list for image-to-image generation
  Two formats are supported:
  **1. Full image URL**
  * Publicly accessible image URL (http\\:// or https\\://)
  * Example: https://example.com/image.jpg
  **2. Base64 encoded format**
  * Format: \`data:image/{format};base64,{base64data}\`
  * Example: \`data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABg...\`
  **Limitations:**
  * Maximum **14** reference images
  * Supported image formats: \`jpeg\`, \`png\`, \`webp\`
</ParamField>

<ParamField body="reference_audio_urls" type="array">
  Enter a list of audio URLs or asset://{assetId}.
  Duration: maximum 3 reference audios, total duration not exceeding 15 s.
</ParamField>

\`\`\`json
{
  "model": "gemini-3.1-flash-image-preview",
  "prompt": "A product shot",
  "image_urls": ["https://example.com/image.jpg"],
  "reference_audio_urls": ["asset://asset-20260404242101-76djj"]
}
\`\`\`
`,
  );

  const imageUrls = details[0]?.requestSchema?.properties?.image_urls;
  const audioUrls = details[0]?.requestSchema?.properties?.reference_audio_urls;

  assert.deepEqual(imageUrls?.items, {
    type: "string",
    format: "uri",
  });
  assert.equal(imageUrls?.maxItems, 14);
  assert.equal(imageUrls?.enum, undefined);
  assert.deepEqual(audioUrls?.items, {
    type: "string",
    format: "uri",
  });
  assert.equal(audioUrls?.maxItems, 3);
});

test("parses apimart generic array types without treating nested examples as urls", () => {
  const details = parseApimartDocMarkdown(
    "wan2.7 Image Generation & Editing",
    "https://docs.apimart.ai/en/api-reference/images/wan2.7-image/generation.md",
    `
# wan2.7 Image Generation & Editing

POST https://api.apimart.ai/v1/images/generations

<ParamField body="model" type="string" default="wan2.7-image-pro" required>
  Image generation model name.
  * \`wan2.7-image-pro\`
  * \`wan2.7-image\`
</ParamField>

<ParamField body="image_urls" type="array<string>">
  Input image URL array for editing and multi-image reference scenarios.
  **Constraints:** Up to 9 images; JPEG / PNG / WEBP / BMP.
</ParamField>

<ParamField body="bbox_list" type="array">
  Bounding boxes for interactive editing.
  **Structure:** \`[[[x1, y1, x2, y2], ...], ...]\`
  * Outer array length must equal the length of \`image_urls\`
  * Max 2 boxes per image
  Example: \`[[], [[989, 515, 1138, 681]]]\`
</ParamField>

<ParamField body="color_palette" type="array<object>">
  Custom color theme.
  * 3–10 entries; each entry requires \`hex\` and \`ratio\`
  \`\`\`json
  [
    { "hex": "#C2D1E6", "ratio": "23.51%" }
  ]
  \`\`\`
</ParamField>

\`\`\`json
{
  "model": "wan2.7-image-pro",
  "image_urls": ["https://example.com/image.jpg"]
}
\`\`\`
`,
  );

  const properties = details[0]?.requestSchema?.properties;

  assert.deepEqual(properties?.image_urls?.items, {
    type: "string",
    format: "uri",
  });
  assert.equal(properties?.image_urls?.maxItems, 9);
  assert.equal(properties?.bbox_list?.type, "array");
  assert.deepEqual(properties?.bbox_list?.items, {});
  assert.equal(properties?.bbox_list?.maxItems, undefined);
  assert.equal(properties?.color_palette?.type, "array");
  assert.deepEqual(properties?.color_palette?.items, {
    type: "object",
  });
});

test("does not infer apimart enum options from supported parameter lists", () => {
  const details = parseApimartDocMarkdown(
    "Z-Image-Turbo Image Generation",
    "https://docs.apimart.ai/en/api-reference/images/z-image-turbo/generation.md",
    `
# Z-Image-Turbo Image Generation

POST https://api.apimart.ai/v1/images/generations

<ParamField body="model" type="string" default="z-image-turbo" required>
  Model name
  * \`z-image-turbo\` - Lightweight and fast image generation
</ParamField>

<ParamField body="prompt" type="string" required>
  Text description for image generation, up to 800 characters
</ParamField>

<ParamField body="size" type="string" default="1:1">
  Image aspect ratio
  Supported aspect ratios:
  * \`1:1\` - Square (default)
  * \`4:3\` - Landscape 4:3
  * \`3:4\` - Portrait 3:4
  * \`16:9\` - Landscape widescreen
  * \`9:16\` - Portrait vertical
  * \`3:2\` - Landscape 3:2
  * \`2:3\` - Portrait 2:3
</ParamField>

<ParamField body="resolution" type="string" default="1K">
  Resolution tier
  * \`1K\` - Standard resolution (default)
  * \`2K\` - High definition resolution
</ParamField>

<ParamField body="prompt_extend" type="boolean" default="false">
  Smart prompt rewriting
  * \`false\` - Disabled (default)
  * \`true\` - Enabled
</ParamField>

\`\`\`json
{
  "model": "z-image-turbo",
  "prompt": "Ink painting style landscape scenery"
}
\`\`\`
`,
  );

  const properties = details[0]?.requestSchema?.properties;

  assert.equal(properties?.size?.enum, undefined);
  assert.equal(properties?.resolution?.enum, undefined);
  assert.equal(properties?.prompt_extend?.enum, undefined);
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
