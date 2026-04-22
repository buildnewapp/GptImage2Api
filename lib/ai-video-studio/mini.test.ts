import assert from "node:assert/strict";
import test from "node:test";

import {
  getAiVideoMiniStudioFieldOptions,
  getAiVideoMiniStudioPrimaryFields,
} from "@/lib/ai-video-studio/mini";
import type { AiVideoStudioFieldDescriptor } from "@/lib/ai-video-studio/schema";

function createField(
  input: Partial<AiVideoStudioFieldDescriptor> & Pick<AiVideoStudioFieldDescriptor, "key">,
): AiVideoStudioFieldDescriptor {
  return {
    key: input.key,
    path: input.path ?? [input.key],
    label: input.label ?? input.key,
    kind: input.kind ?? "enum",
    required: input.required ?? false,
    schema: input.schema ?? { type: "string" },
    defaultValue: input.defaultValue,
  };
}

test("treats size fields with aspect ratio semantics as the mini studio size control", () => {
  const fields: AiVideoStudioFieldDescriptor[] = [
    createField({
      key: "prompt",
      kind: "text",
      required: true,
      schema: { type: "string" },
    }),
    createField({
      key: "size",
      schema: {
        type: "string",
        description: "Video aspect ratio.",
        enum: ["16:9", "9:16", "1:1", "adaptive"],
      },
      defaultValue: "16:9",
    }),
  ];

  const primaryFields = getAiVideoMiniStudioPrimaryFields(fields);

  assert.equal(primaryFields.aspectRatioField?.key, "size");
});

test("expands numeric duration ranges into selectable mini studio options", () => {
  const field = createField({
    key: "duration",
    kind: "number",
    schema: {
      type: "integer",
      minimum: 4,
      maximum: 15,
      default: 5,
    },
    defaultValue: 5,
  });

  assert.deepEqual(getAiVideoMiniStudioFieldOptions(field), [
    4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  ]);
});
