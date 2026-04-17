import assert from "node:assert/strict";
import test from "node:test";

import {
  findAiStudioCatalogEntryById,
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
