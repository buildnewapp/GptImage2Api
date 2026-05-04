import assert from "node:assert/strict";
import test from "node:test";

import { buildAdminImageUploadObjectKey } from "@/lib/cms/admin-image-upload";

test("builds admin image upload keys under blogs date folder", () => {
  assert.equal(
    buildAdminImageUploadObjectKey({
      fileName: "Cover Image.PNG",
      now: new Date(2026, 4, 4, 17, 49),
      randomId: () => "abc123",
    }),
    "blogs/20260504/cover-image-abc123.png",
  );
});
