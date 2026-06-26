import assert from "node:assert/strict";
import test from "node:test";

import { collectApiFieldDocs } from "@/components/ai/AIVideoStudioApiDocs";
import AIVideoStudioFields from "@/components/ai/AIVideoStudioFields";
import { renderToStaticMarkup } from "react-dom/server";

test("collects api field docs from requestSchema.properties.input", () => {
  const docs = collectApiFieldDocs({
    copy: {
      required: "必填",
      type: "类型",
      enum: "可选值",
      range: "范围",
      minimum: "最小值",
      maximum: "最大值",
    },
    requestSchema: {
      type: "object",
      properties: {
        input: {
          type: "object",
          required: ["prompt"],
          properties: {
            prompt: {
              type: "string",
              description: "Main prompt text.",
            },
            duration: {
              type: "integer",
              description: "Video duration in seconds.",
              minimum: 4,
              maximum: 15,
            },
            aspect_ratio: {
              type: "string",
              enum: ["16:9", "9:16"],
            },
          },
          "x-apidog-orders": ["duration", "prompt", "aspect_ratio"],
        },
      },
    },
  });

  assert.deepEqual(
    docs.map((item) => item.key),
    ["duration", "prompt", "aspect_ratio"],
  );
  assert.deepEqual(docs[0], {
    key: "duration",
    title: "duration",
    description: "Video duration in seconds.",
    meta: "类型: integer · 范围: 4 - 15",
  });
  assert.deepEqual(docs[1], {
    key: "prompt",
    title: "prompt",
    description: "Main prompt text.",
    meta: "必填 · 类型: string",
  });
  assert.deepEqual(docs[2], {
    key: "aspect_ratio",
    title: "aspect_ratio",
    description: "",
    meta: "类型: string · 可选值: 16:9, 9:16",
  });
});

test("collects api field docs from root object requestSchema", () => {
  const docs = collectApiFieldDocs({
    copy: {
      required: "必填",
      type: "类型",
      enum: "可选值",
      range: "范围",
      minimum: "最小值",
      maximum: "最大值",
    },
    requestSchema: {
      type: "object",
      required: ["prompt"],
      properties: {
        max_images: {
          type: "integer",
          description: "Maximum number of images to return.",
          minimum: 1,
          maximum: 6,
        },
        image_size: {
          title: "Image Size",
          description: "The size of the generated image.",
          anyOf: [
            {
              type: "object",
            },
            {
              type: "string",
              enum: ["square_hd", "auto_2K"],
            },
          ],
        },
        prompt: {
          type: "string",
          description: "The text prompt used to generate the image.",
        },
      },
      "x-apidog-orders": ["prompt", "image_size", "max_images"],
    },
  });

  assert.deepEqual(
    docs.map((item) => item.key),
    ["prompt", "image_size", "max_images"],
  );
  assert.deepEqual(docs[0], {
    key: "prompt",
    title: "prompt",
    description: "The text prompt used to generate the image.",
    meta: "必填 · 类型: string",
  });
  assert.deepEqual(docs[1], {
    key: "image_size",
    title: "image_size",
    description: "The size of the generated image.",
    meta: "",
  });
  assert.deepEqual(docs[2], {
    key: "max_images",
    title: "max_images",
    description: "Maximum number of images to return.",
    meta: "类型: integer · 范围: 1 - 6",
  });
});

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

test("renders custom image size fields as preset plus dimensions", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFields
      primaryFields={[
        {
          key: "image_size",
          path: ["image_size"],
          label: "image_size",
          kind: "text",
          required: false,
          schema: {
            type: "object",
            title: "Image Size",
            "x-ui-control": "image-size",
            "x-ui-image-size-options": [
              {
                label: "Square HD",
                value: "square_hd",
                width: 1024,
                height: 1024,
              },
              {
                label: "Landscape 4:3",
                value: "landscape_4_3",
                width: 1024,
                height: 768,
              },
            ],
            default: {
              width: 1024,
              height: 768,
            },
          },
          defaultValue: {
            width: 1024,
            height: 768,
          },
        },
      ]}
      advancedFields={[]}
      values={{
        image_size: {
          width: 1024,
          height: 1024,
        },
      }}
      isPublic
      localizedFieldLabels={{
        imageSize: "Image Size",
      }}
      onChange={() => {}}
      onPublicChange={() => {}}
    />,
  );

  assert.match(html, /data-ai-video-studio-image-size-field="image_size"/);
  assert.match(html, /data-slot="select-trigger"/);
  assert.match(html, /data-selected-value="square_hd"/);
  assert.match(html, /value="1024"/);
  assert.match(html, /aria-label="Image Size width"/);
  assert.match(html, /aria-label="Image Size height"/);
});

test("maps image size and quality fields to distinct labels", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFields
      primaryFields={[
        {
          key: "image_size",
          path: ["image_size"],
          label: "image_size",
          kind: "text",
          required: false,
          schema: {
            type: "object",
            "x-ui-control": "image-size",
            "x-ui-image-size-options": [],
          },
          defaultValue: {},
        },
        {
          key: "quality",
          path: ["quality"],
          label: "quality",
          kind: "enum",
          required: false,
          schema: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
          defaultValue: "high",
        },
      ]}
      advancedFields={[]}
      values={{
        image_size: {
          width: 1024,
          height: 768,
        },
        quality: "high",
      }}
      isPublic
      localizedFieldLabels={{
        imageSize: "Image Size",
        quality: "Quality",
        size: "Size",
      }}
      onChange={() => {}}
      onPublicChange={() => {}}
    />,
  );

  assert.match(html, />Image Size</);
  assert.match(html, />Quality</);
  assert.doesNotMatch(html, />Size</);
});

test("keeps fal image size string presets selected in image size controls", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFields
      primaryFields={[
        {
          key: "image_size",
          path: ["image_size"],
          label: "image_size",
          kind: "text",
          required: false,
          schema: {
            title: "Image Size",
            default: "auto_2K",
            "x-ui-control": "image-size",
            "x-ui-image-size-options": [
              {
                label: "Square HD",
                value: "square_hd",
              },
              {
                label: "Auto 2K",
                value: "auto_2K",
              },
              {
                label: "Custom",
                value: "__custom",
                custom: true,
              },
            ],
          },
          defaultValue: "auto_2K",
        },
      ]}
      advancedFields={[]}
      values={{
        image_size: "auto_2K",
      }}
      isPublic
      localizedFieldLabels={{
        imageSize: "Image Size",
      }}
      onChange={() => {}}
      onPublicChange={() => {}}
    />,
  );

  assert.match(html, /data-slot="select-trigger"/);
  assert.match(html, /data-selected-value="auto_2K"/);
  assert.doesNotMatch(html, /data-selected-value="__custom"/);
});

test("renders common image generation fields with custom controls", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFields
      primaryFields={[
        {
          key: "negative_prompt",
          path: ["negative_prompt"],
          label: "negative_prompt",
          kind: "text",
          required: false,
          schema: {
            type: "string",
          },
          defaultValue: "",
        },
        {
          key: "num_images",
          path: ["num_images"],
          label: "num_images",
          kind: "number",
          required: false,
          schema: {
            type: "integer",
            minimum: 1,
            maximum: 4,
          },
          defaultValue: 1,
        },
        {
          key: "output_format",
          path: ["output_format"],
          label: "output_format",
          kind: "enum",
          required: false,
          schema: {
            type: "string",
            enum: ["png", "jpeg", "webp"],
          },
          defaultValue: "png",
        },
      ]}
      advancedFields={[]}
      values={{
        negative_prompt: "blurry",
        num_images: 2,
        output_format: "webp",
      }}
      isPublic
      localizedFieldLabels={{
        negativePrompt: "Negative Prompt",
        numImages: "Num Images",
        outputFormat: "Output Format",
      }}
      onChange={() => {}}
      onPublicChange={() => {}}
    />,
  );

  assert.match(html, /data-ai-video-studio-negative-prompt-field="negative_prompt"/);
  assert.match(html, /data-ai-video-studio-num-images-field="num_images"/);
  assert.match(html, /data-ai-video-studio-output-format-field="output_format"/);
  assert.match(html, />Negative Prompt</);
  assert.match(html, />Num Images</);
  assert.match(html, />Output Format</);
  assert.match(html, /aria-pressed="false"[^>]*>1</);
  assert.match(html, /aria-pressed="true"[^>]*>2</);
  assert.match(html, /aria-pressed="false"[^>]*>3</);
  assert.match(html, /aria-pressed="false"[^>]*>4</);
  assert.match(html, /aria-pressed="true"[^>]*>webp</);
});

test("uses formatted field names for image reference field labels", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFields
      primaryFields={[
        {
          key: "image_urls",
          path: ["image_urls"],
          label: "image_urls",
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
        {
          key: "mask_url",
          path: ["mask_url"],
          label: "mask_url",
          kind: "text",
          required: false,
          schema: {
            title: "Mask URL",
            description:
              "The URL of the mask image to use for the generation. This indicates what part of the image to edit.",
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
          },
          defaultValue: "",
        },
      ]}
      advancedFields={[]}
      values={{
        image_urls: [],
        mask_url: "",
      }}
      isPublic
      localizedFieldLabels={{
        referenceImages: "Reference Images",
      } as any}
      onChange={() => {}}
      onPublicChange={() => {}}
    />,
  );

  assert.match(html, />Image Urls</);
  assert.match(html, />Mask URL</);
  assert.doesNotMatch(html, />Reference Images</);
  assert.equal(
    html.match(/data-ai-video-studio-reference-field="image"/g)?.length,
    2,
  );
});

test("renders max images with a dedicated numeric option control", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFields
      primaryFields={[
        {
          key: "max_images",
          path: ["max_images"],
          label: "max_images",
          kind: "number",
          required: false,
          schema: {
            type: "integer",
            minimum: 1,
            maximum: 4,
          },
          defaultValue: 1,
        },
      ]}
      advancedFields={[]}
      values={{
        max_images: 3,
      }}
      isPublic
      localizedFieldLabels={{
        maxImages: "Max Images",
      }}
      onChange={() => {}}
      onPublicChange={() => {}}
    />,
  );

  assert.match(html, /data-ai-video-studio-max-images-field="max_images"/);
  assert.match(html, />Max Images</);
  assert.match(html, /aria-pressed="false"[^>]*>1</);
  assert.match(html, /aria-pressed="false"[^>]*>2</);
  assert.match(html, /aria-pressed="true"[^>]*>3</);
  assert.match(html, /aria-pressed="false"[^>]*>4</);
});

test("formats raw schema field names as readable labels", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFields
      primaryFields={[
        {
          key: "enable_safety_checker",
          path: ["enable_safety_checker"],
          label: "enable_safety_checker",
          kind: "boolean",
          required: false,
          schema: {
            type: "boolean",
          },
          defaultValue: true,
        },
        {
          key: "cfg_scale",
          path: ["input", "cfg_scale"],
          label: "cfg_scale",
          kind: "number",
          required: false,
          schema: {
            type: "number",
            minimum: 1,
            maximum: 20,
          },
          defaultValue: 7,
        },
      ]}
      advancedFields={[]}
      values={{
        enable_safety_checker: true,
        input: {
          cfg_scale: 7,
        },
      }}
      isPublic
      onChange={() => {}}
      onPublicChange={() => {}}
    />,
  );

  assert.match(html, />Enable Safety Checker</);
  assert.match(html, />Cfg Scale</);
  assert.doesNotMatch(html, />enable_safety_checker</);
  assert.doesNotMatch(html, />input.cfg_scale</);
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

test("uses formatted field names for audio reference field labels", () => {
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

  assert.match(html, />Audio Urls</);
  assert.doesNotMatch(html, />参考音频</);
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

  assert.match(html, />First Frame URL</);
  assert.match(html, />Last Frame URL</);
  assert.equal((html.match(/data-ai-video-studio-reference-field="image"/g) ?? []).length, 2);
  assert.equal((html.match(/data-ai-video-studio-reference-multiple="false"/g) ?? []).length, 2);
});

test("renders a default parameter icon for regular schema fields", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFields
      primaryFields={[
        {
          key: "cfg_scale",
          path: ["cfg_scale"],
          label: "cfg_scale",
          kind: "number",
          required: false,
          schema: {
            type: "number",
            minimum: 1,
            maximum: 20,
          },
          defaultValue: "",
        },
      ]}
      advancedFields={[]}
      values={{ cfg_scale: 7 }}
      isPublic
      onChange={() => {}}
      onPublicChange={() => {}}
    />,
  );

  assert.match(html, />Cfg Scale</);
  assert.match(html, /lucide-sliders-horizontal/);
});
