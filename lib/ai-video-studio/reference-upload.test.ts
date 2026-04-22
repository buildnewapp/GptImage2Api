import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReferenceUploadObjectKey,
  uploadReferenceFile,
} from "@/lib/ai-video-studio/reference-upload";

test("builds dated reference upload keys on the server", () => {
  const key = buildReferenceUploadObjectKey({
    kind: "image",
    fileName: "Scene Final.PNG",
    now: new Date("2026-04-12T08:00:00.000Z"),
    randomId: () => "abc12345",
  });

  assert.equal(
    key,
    "reference-images/20260412/scene-final-abc12345.png",
  );
});

test("uploads reference files through the backend api instead of direct r2 put", async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input, init) => {
    calls.push({ input, init });

    return Response.json({
      success: true,
      data: {
        publicObjectUrl: "https://cdn.example.com/reference-images/20260412/scene-final-abc12345.png",
      },
    });
  }) as typeof fetch;

  try {
    const file = new File(["demo"], "Scene Final.PNG", {
      type: "image/png",
    });

    const uploadedUrl = await uploadReferenceFile({
      kind: "image",
      file,
    });

    assert.equal(
      uploadedUrl,
      "https://cdn.example.com/reference-images/20260412/scene-final-abc12345.png",
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.input, "/api/ai-studio/reference-upload");
    assert.equal(calls[0]?.init?.method, "POST");

    const body = calls[0]?.init?.body;
    assert.ok(body instanceof FormData);
    assert.equal(body.get("kind"), "image");
    assert.equal((body.get("file") as File | null)?.name, "Scene Final.PNG");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
