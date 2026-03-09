import assert from "node:assert/strict";
import test from "node:test";

import AIVideoStudioFieldControl from "@/components/ai/AIVideoStudioFieldControl";
import {
  beginHorizontalDragScroll,
  createRandomSeedValue,
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
  assert.match(html, /flex flex-row/);
  assert.match(html, /gap-3/);
  assert.match(html, /scrollbar-thin/);
  assert.match(html, /min-h-18/);
  assert.match(html, /min-w-\[72px\]/);
  assert.match(html, /scrollbar-width:thin/);
  assert.match(html, /scrollbar-color:#d1d5db transparent/);
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

test("renders boolean fields in compact mode without bordered card styling", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "generate_audio",
        kind: "boolean",
        schema: {
          type: "boolean",
        },
      } as any}
      label="Generate audio"
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

test("renders compact seed as a single-row control with randomize action", () => {
  const html = renderToStaticMarkup(
    <AIVideoStudioFieldControl
      field={{
        key: "seed",
        kind: "number",
        schema: {
          type: "integer",
        },
      } as any}
      label="Seed"
      value={42}
      compact
      onChange={() => {}}
    />,
  );

  assert.match(html, /data-compact-seed-row="true"/);
  assert.match(html, /type="number"/);
  assert.match(html, /aria-label="Randomize seed"/);
  assert.match(html, /max-w-\[180px\]/);
});

test("creates bounded random seed values", () => {
  for (let index = 0; index < 20; index += 1) {
    const value = createRandomSeedValue();

    assert.equal(Number.isInteger(value), true);
    assert.ok(value >= 0);
    assert.ok(value <= 2147483646);
  }
});
