import assert from "node:assert/strict";
import test from "node:test";

import AIVideoStudioFields from "@/components/ai/AIVideoStudioFields";
import { renderToStaticMarkup } from "react-dom/server";

test("renders advanced fields inside a collapsible trigger section", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFields
      primaryFields={[
        {
          key: "prompt",
          path: ["prompt"],
          label: "Prompt",
          kind: "text",
          required: true,
          schema: {
            type: "string",
          },
          defaultValue: "",
        },
      ]}
      advancedFields={[
        {
          key: "seed",
          path: ["seed"],
          label: "Seed",
          kind: "number",
          required: false,
          schema: {
            type: "number",
          },
          defaultValue: "",
        },
      ]}
      values={{
        prompt: "hello",
        seed: 7,
      }}
      isPublic
      showPublicInAdvanced
      onChange={() => {}}
      onPublicChange={() => {}}
    />,
  );

  assert.match(html, />Advanced</);
  assert.match(html, /data-ai-video-studio-advanced/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /data-state="closed"/);
  assert.match(html, /ai-video-studio-advanced-public/);
  assert.doesNotMatch(html, /data-ai-video-studio-public-region="advanced"/);
});

test("keeps public visibility outside advanced section when default grouping is disabled", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFields
      primaryFields={[]}
      advancedFields={[]}
      values={{}}
      isPublic
      onChange={() => {}}
      onPublicChange={() => {}}
    />,
  );

  assert.match(html, /data-ai-video-studio-public/);
  assert.doesNotMatch(html, /ai-video-studio-advanced-public/);
});

test("maps size field with aspect ratio semantics to the aspect ratio label", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFields
      primaryFields={[
        {
          key: "size",
          path: ["size"],
          label: "size",
          kind: "enum",
          required: true,
          schema: {
            type: "string",
            description: "Video aspect ratio.",
            enum: ["16:9", "9:16", "1:1"],
          },
          defaultValue: "16:9",
        },
      ]}
      advancedFields={[]}
      values={{ size: "16:9" }}
      isPublic
      localizedFieldLabels={{
        size: "画质",
        aspectRatio: "比例",
      }}
      onChange={() => {}}
      onPublicChange={() => {}}
    />,
  );

  assert.match(html, />比例</);
  assert.doesNotMatch(html, />画质</);
});

test("uses a fallback prompt counter when the schema omits maxLength", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFields
      primaryFields={[
        {
          key: "prompt",
          path: ["prompt"],
          label: "Prompt",
          kind: "text",
          required: true,
          schema: {
            type: "string",
            description: "Video content description.",
          },
          defaultValue: "",
        },
      ]}
      advancedFields={[]}
      values={{ prompt: "hello" }}
      isPublic
      localizedFieldLabels={{
        prompt: "提示词",
      }}
      onChange={() => {}}
      onPublicChange={() => {}}
    />,
  );

  assert.match(html, />提示词</);
  assert.match(html, /5\/1000/);
});

test("maps audio reference fields to the reference audio label", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFields
      primaryFields={[
        {
          key: "audio_urls",
          path: ["audio_urls"],
          label: "audio_urls",
          kind: "array",
          required: false,
          schema: {
            type: "array",
            items: {
              type: "string",
              format: "uri",
            },
          },
          defaultValue: [],
        },
      ]}
      advancedFields={[]}
      values={{ audio_urls: [] }}
      isPublic
      localizedFieldLabels={{
        referenceAudios: "参考音频",
      } as any}
      onChange={() => {}}
      onPublicChange={() => {}}
    />,
  );

  assert.match(html, />参考音频</);
  assert.match(html, /data-ai-video-studio-reference-field="audio"/);
});

test("treats first and last frame urls as dedicated single image upload fields", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFields
      primaryFields={[
        {
          key: "first_frame_url",
          path: ["input", "first_frame_url"],
          label: "first_frame_url",
          kind: "text",
          required: false,
          schema: {
            type: "string",
            format: "uri",
            description: "First frame image url",
          },
          defaultValue: "",
        },
        {
          key: "last_frame_url",
          path: ["input", "last_frame_url"],
          label: "last_frame_url",
          kind: "text",
          required: false,
          schema: {
            type: "string",
            format: "uri",
            description: "Last frame image url",
          },
          defaultValue: "",
        },
      ]}
      advancedFields={[]}
      values={{}}
      isPublic
      onChange={() => {}}
      onPublicChange={() => {}}
    />,
  );

  assert.match(html, />First Frame</);
  assert.match(html, />Last Frame</);
  assert.equal((html.match(/data-ai-video-studio-reference-field="image"/g) ?? []).length, 2);
  assert.equal((html.match(/data-ai-video-studio-reference-multiple="false"/g) ?? []).length, 2);
});
