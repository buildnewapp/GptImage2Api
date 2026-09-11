import assert from "node:assert/strict";
import test from "node:test";

import { prepareVideoReferenceUrl, renderReferencePreview } from "@/components/ai/fields/ReferenceField";

test("video previews report loaded durations so restored references can be priced", () => {
  const durations: number[] = [];
  const preview = renderReferencePreview("video", "https://example.com/input.mp4", (duration) => durations.push(duration));
  assert.ok(preview);
  for (const duration of [5.2, NaN, Infinity, 0, -1]) {
    preview.props.onLoadedMetadata({ currentTarget: { duration } });
  }
  assert.deepEqual(durations, [6]);
});

test("prepareVideoReferenceUrl returns the resolved duration for video urls", async () => {
  const result = await prepareVideoReferenceUrl({
    url: "https://example.com/input.mp4",
    readDuration: async () => 7.25,
  });

  assert.deepEqual(result, {
    url: "https://example.com/input.mp4",
    duration: 8,
  });
});

test("prepareVideoReferenceUrl rejects urls whose duration cannot be resolved", async () => {
  const result = await prepareVideoReferenceUrl({
    url: "https://example.com/input.mp4",
    readDuration: async () => null,
  });

  assert.equal(result, null);
});
