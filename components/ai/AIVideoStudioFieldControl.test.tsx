import assert from "node:assert/strict";
import test from "node:test";

import AIVideoStudioFieldControl from "@/components/ai/AIVideoStudioFieldControl";
import {
  beginHorizontalDragScroll,
  getAiVideoStudioFieldIconName,
  updateHorizontalDragScroll,
} from "@/components/ai/AIVideoStudioFieldControl";
import { renderToStaticMarkup } from "react-dom/server";

test("renders aspect ratio options as a compact horizontal strip", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "aspect_ratio",
        kind: "enum",
        schema: {
          type: "string",
          enum: ["16:9", "9:16", "1:1"],
        },
      } as any}
      label="Aspect ratio"
      value="16:9"
      onChange={() => {}}
    />,
  );

  assert.match(html, /overflow-x-auto/);
  assert.match(html, /flex-nowrap/);
  assert.match(html, /cursor-grab/);
  assert.match(html, /min-h-16/);
  assert.match(html, /min-w-\[72px\]/);
  assert.match(html, /scrollbar-width:none/);
  assert.match(html, /::-webkit-scrollbar/);
});

test("uses explicit icons for resolution and duration fields", () => {
  assert.equal(
    getAiVideoStudioFieldIconName({ key: "resolution", kind: "enum" } as any),
    "monitor",
  );
  assert.equal(
    getAiVideoStudioFieldIconName({ key: "duration", kind: "enum" } as any),
    "clock",
  );
  assert.equal(
    getAiVideoStudioFieldIconName({ key: "n_frames", kind: "enum" } as any),
    "clock",
  );
});

test("computes horizontal drag scroll offsets from pointer movement", () => {
  const session = beginHorizontalDragScroll(40, 120);

  assert.equal(updateHorizontalDragScroll(session, 10), 150);
  assert.equal(updateHorizontalDragScroll(session, 70), 90);
});
