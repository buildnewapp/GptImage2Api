import assert from "node:assert/strict";
import test from "node:test";

import AIVideoStudioFieldControl from "@/components/ai/AIVideoStudioFieldControl";
import {
  beginHorizontalDragScroll,
  updateHorizontalDragScroll,
} from "@/components/ai/AIVideoStudioFieldControl";
import { renderToStaticMarkup } from "react-dom/server";

test("renders enum fields as pill buttons with raw option values", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "aspect_ratio",
        path: ["aspect_ratio"],
        kind: "enum",
        schema: {
          type: "string",
          enum: ["16:9", "9:16", "1:1"],
        },
      } as any}
      label="aspect_ratio"
      value="16:9"
      onChange={() => {}}
    />,
  );

  assert.match(html, /<button/);
  assert.match(html, /type="button"/);
  assert.match(html, />16:9</);
  assert.match(html, />9:16</);
  assert.match(html, />1:1</);
  assert.match(html, /flex flex-wrap gap-3/);
  assert.match(html, /bg-foreground text-background/);
  assert.doesNotMatch(html, /<select/);
  assert.doesNotMatch(html, /lucide-/);
});

test("renders raw field labels without icon markup", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "generate_audio",
        path: ["generate_audio"],
        kind: "boolean",
        schema: {
          type: "boolean",
        },
      } as any}
      label="generate_audio"
      value={true}
      onChange={() => {}}
    />,
  );

  assert.match(html, />generate_audio</);
  assert.doesNotMatch(html, /lucide-/);
});

test("renders schema descriptions as title attributes for regular field labels", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "generate_audio",
        path: ["generate_audio"],
        kind: "boolean",
        schema: {
          type: "boolean",
          description: "Whether to generate audio for the video.",
        },
      } as any}
      label="generate_audio"
      value={true}
      onChange={() => {}}
    />,
  );

  assert.match(html, /title="Whether to generate audio for the video\."/);
  assert.match(html, /data-ai-video-studio-field-description-trigger="true"/);
});

test("renders string arrays as array editors driven by the items schema", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "tags",
        path: ["tags"],
        kind: "array",
        schema: {
          type: "array",
          items: {
            type: "string",
          },
        },
      } as any}
      label="tags"
      value={["cinematic"]}
      onChange={() => {}}
    />,
  );

  assert.match(html, /data-ai-video-studio-array-field="tags"/);
  assert.match(html, /data-ai-video-studio-array-item="0"/);
  assert.match(html, /Add Item/);
  assert.match(html, /Remove/);
  assert.match(html, /text-\[13px\]/);
  assert.doesNotMatch(html, /type="file"/);
});

test("renders object arrays with compact child fields based on item properties", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "shots",
        path: ["shots"],
        kind: "array",
        schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
              },
              duration: {
                type: "integer",
                enum: [4, 8],
              },
            },
          },
        },
      } as any}
      label="shots"
      value={[
        {
          prompt: "A close-up",
          duration: 4,
        },
      ]}
      onChange={() => {}}
    />,
  );

  assert.match(html, /data-ai-video-studio-array-field="shots"/);
  assert.match(html, /data-ai-video-studio-array-object="0"/);
  assert.match(html, />prompt</);
  assert.match(html, />duration</);
  assert.match(html, /bg-foreground text-background/);
  assert.match(html, /text-\[13px\]/);
});

test("computes horizontal drag scroll offsets from pointer movement", () => {
  const session = beginHorizontalDragScroll(40, 120);

  assert.equal(updateHorizontalDragScroll(session, 10), 150);
  assert.equal(updateHorizontalDragScroll(session, 70), 90);
});

test("renders boolean fields in compact mode without bordered card styling", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "generate_audio",
        path: ["generate_audio"],
        kind: "boolean",
        schema: {
          type: "boolean",
        },
      } as any}
      label="generate_audio"
      value={true}
      compact
      onChange={() => {}}
    />,
  );

  assert.match(html, /items-center/);
  assert.match(html, /justify-between/);
  assert.match(html, /gap-3/);
  assert.match(html, /bg-transparent px-0 py-1/);
  assert.match(html, /text-\[13px\]/);
  assert.doesNotMatch(html, /border border-border\/60/);
});

test("renders multiline prompt counters when a max length is provided", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "prompt",
        path: ["prompt"],
        kind: "text",
        schema: {
          type: "string",
          description: "Describe the video scene.",
        },
      } as any}
      label="提示词"
      value="hello"
      onChange={() => {}}
    />,
  );

  assert.match(html, /data-ai-video-studio-prompt-field/);
  assert.match(html, /<textarea/);
  assert.match(html, /title="Describe the video scene\."/);
  assert.match(html, /data-ai-video-studio-field-description-trigger="true"/);
  assert.match(html, /5\/1000/);
  assert.match(html, /h-\[120px\]/);
});

test("renders image url arrays with the specialized reference field UI", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "image_urls",
        path: ["image_urls"],
        kind: "array",
        schema: {
          type: "array",
          maxItems: 3,
          description: "Reference images for style guidance.",
          items: {
            type: "string",
            format: "uri",
          },
        },
      } as any}
      label="参考图片"
      value={[]}
      onChange={() => {}}
    />,
  );

  assert.match(html, /data-ai-video-studio-reference-field="image"/);
  assert.match(html, /data-ai-video-studio-reference-multiple="true"/);
  assert.match(html, /title="Reference images for style guidance\."/);
  assert.match(html, /data-ai-video-studio-field-description-trigger="true"/);
  assert.doesNotMatch(html, /0\/9/);
  assert.doesNotMatch(html, /Upload reference images, up to 9\./);
  assert.doesNotMatch(html, /text-2xl/);
  assert.doesNotMatch(html, /size-16/);
  assert.doesNotMatch(html, /min-h-\[160px\]/);
});

test("renders single video urls with the specialized reference field UI", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "video_url",
        path: ["video_url"],
        kind: "text",
        schema: {
          type: "string",
          format: "uri",
        },
      } as any}
      label="参考视频"
      value=""
      onChange={() => {}}
    />,
  );

  assert.match(html, /data-ai-video-studio-reference-field="video"/);
  assert.match(html, /data-ai-video-studio-reference-multiple="false"/);
  assert.doesNotMatch(html, /0\/1/);
});

test("renders uploaded image references as image previews", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "image_urls",
        path: ["image_urls"],
        kind: "array",
        schema: {
          type: "array",
          items: {
            type: "string",
            format: "uri",
          },
        },
      } as any}
      label="参考图片"
      value={["https://cdn.example.com/reference-images/20260412/test.png"]}
      onChange={() => {}}
    />,
  );

  assert.match(html, /<img/);
  assert.match(html, /src="https:\/\/cdn\.example\.com\/reference-images\/20260412\/test\.png"/);
  assert.match(html, /aspect-square/);
  assert.doesNotMatch(html, />https:\/\/cdn\.example\.com\/reference-images\/20260412\/test\.png</);
});

test("renders uploaded video references as video previews", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "video_urls",
        path: ["video_urls"],
        kind: "array",
        schema: {
          type: "array",
          items: {
            type: "string",
            format: "uri",
          },
        },
      } as any}
      label="参考视频"
      value={["https://cdn.example.com/reference-videos/20260412/test.mp4"]}
      onChange={() => {}}
    />,
  );

  assert.match(html, /<video/);
  assert.match(html, /src="https:\/\/cdn\.example\.com\/reference-videos\/20260412\/test\.mp4"/);
  assert.match(html, /aspect-square/);
});

test("renders uploaded audio references as audio previews", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "audio_urls",
        path: ["audio_urls"],
        kind: "array",
        schema: {
          type: "array",
          items: {
            type: "string",
            format: "uri",
          },
        },
      } as any}
      label="参考音频"
      value={["https://cdn.example.com/reference-audios/20260412/test.mp3"]}
      onChange={() => {}}
    />,
  );

  assert.match(html, /data-ai-video-studio-audio-preview/);
  assert.match(html, /aspect-square/);
  assert.match(html, /src="https:\/\/cdn\.example\.com\/reference-audios\/20260412\/test\.mp3"/);
});

test("renders audio url arrays with the specialized audio reference UI", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "audio_urls",
        path: ["audio_urls"],
        kind: "array",
        schema: {
          type: "array",
          items: {
            type: "string",
            format: "uri",
          },
        },
      } as any}
      label="参考音频"
      value={[]}
      onChange={() => {}}
    />,
  );

  assert.match(html, /data-ai-video-studio-reference-field="audio"/);
  assert.doesNotMatch(html, /0\/9/);
});

test("renders image_with_roles as fixed first and end frame upload slots", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "image_with_roles",
        path: ["image_with_roles"],
        kind: "array",
        schema: {
          type: "array",
          items: {
            type: "object",
            required: ["url", "role"],
            properties: {
              url: {
                type: "string",
                format: "uri",
              },
              role: {
                type: "string",
                enum: ["first_frame", "last_frame"],
              },
            },
          },
        },
      } as any}
      label="首尾帧"
      value={[]}
      onChange={() => {}}
    />,
  );

  assert.match(html, /data-ai-video-studio-image-with-roles/);
  assert.match(html, /data-ai-video-studio-reference-upload-shell="image"/);
  assert.match(html, />First Frame</);
  assert.match(html, />End Frame</);
  assert.match(html, /Use URL/);
  assert.doesNotMatch(html, /Add Item/);
  assert.doesNotMatch(html, /data-ai-video-studio-array-field="image_with_roles"/);
});

test("hides the upload area for a filled image_with_roles slot and uses 100px preview height", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "image_with_roles",
        path: ["image_with_roles"],
        kind: "array",
        schema: {
          type: "array",
          items: {
            type: "object",
            required: ["url", "role"],
            properties: {
              url: {
                type: "string",
                format: "uri",
              },
              role: {
                type: "string",
                enum: ["first_frame", "last_frame"],
              },
            },
          },
        },
      } as any}
      label="首尾帧"
      value={[
        {
          url: "https://cdn.example.com/first.png",
          role: "first_frame",
        },
      ]}
      onChange={() => {}}
    />,
  );

  assert.equal(
    html.match(/type="file"/g)?.length ?? 0,
    1,
  );
  assert.match(html, /h-\[100px\]/);
});

test("treats plural reference fields as multi-value inputs capped at 9", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "images",
        path: ["images"],
        kind: "array",
        schema: {
          type: "array",
          maxItems: 3,
          items: {
            type: "string",
            format: "uri",
          },
        },
      } as any}
      label="参考图片"
      value={[]}
      onChange={() => {}}
    />,
  );

  assert.match(html, /data-ai-video-studio-reference-field="image"/);
  assert.match(html, /data-ai-video-studio-reference-multiple="true"/);
  assert.match(html, /multiple=""/);
  assert.doesNotMatch(html, /0\/9/);
});

test("treats singular reference fields as single-value inputs even when schema allows many", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "image",
        path: ["image"],
        kind: "array",
        schema: {
          type: "array",
          maxItems: 9,
          items: {
            type: "string",
            format: "uri",
          },
        },
      } as any}
      label="参考图片"
      value={[]}
      onChange={() => {}}
    />,
  );

  assert.match(html, /data-ai-video-studio-reference-field="image"/);
  assert.match(html, /data-ai-video-studio-reference-multiple="false"/);
  assert.doesNotMatch(html, /multiple=""/);
  assert.doesNotMatch(html, /0\/1/);
});

test("shows reference counts only when explicitly enabled", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "image_urls",
        path: ["image_urls"],
        kind: "array",
        schema: {
          type: "array",
          items: {
            type: "string",
            format: "uri",
          },
        },
      } as any}
      label="参考图片"
      value={[]}
      referenceFieldTexts={{
        showCountLabel: true,
        countLabel: (current, max) => `${current}/${max}`,
      }}
      onChange={() => {}}
    />,
  );

  assert.match(html, /0\/9/);
});

test("treats camelCase imageUrls fields as image reference uploads", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "imageUrls",
        path: ["imageUrls"],
        kind: "array",
        schema: {
          type: "array",
          items: {
            type: "string",
          },
          description: "Image URL list used in image-to-video mode.",
        },
      } as any}
      label="参考图片"
      value={[]}
      onChange={() => {}}
    />,
  );

  assert.match(html, /data-ai-video-studio-reference-field="image"/);
  assert.match(html, /data-ai-video-studio-reference-multiple="true"/);
});
