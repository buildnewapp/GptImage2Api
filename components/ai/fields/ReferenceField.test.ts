import assert from "node:assert/strict";
import test from "node:test";

import { prepareVideoReferenceUrl } from "@/components/ai/fields/ReferenceField";

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
