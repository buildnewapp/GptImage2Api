import assert from "node:assert/strict";
import test from "node:test";

import AIVideoStudioFieldControl from "@/components/ai/AIVideoStudioFieldControl";
import {
  beginHorizontalDragScroll,
  updateHorizontalDragScroll,
} from "@/components/ai/AIVideoStudioFieldControl";
import { renderToStaticMarkup } from "react-dom/server";

test("renders enum fields as a native select with raw option values", () => {
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

  assert.match(html, /<select/);
  assert.match(html, />16:9</);
  assert.match(html, />9:16</);
  assert.match(html, />1:1</);
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

test("renders string arrays as plain text inputs instead of upload widgets", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "image_urls",
        path: ["image_urls"],
        kind: "string-array",
        schema: {
          type: "array",
          items: {
            type: "string",
          },
        },
      } as any}
      label="image_urls"
      value={["https://example.com/a.png"]}
      onChange={() => {}}
    />,
  );

  assert.match(html, /<input/);
  assert.match(html, /image_urls/);
  assert.doesNotMatch(html, /type="file"/);
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
