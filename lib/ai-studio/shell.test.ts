import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAiStudioQueryString,
  collectRenderableMediaUrls,
  parseAiStudioUrlState,
  shouldHydrateAiStudioUrlState,
} from "@/lib/ai-studio/shell";

test("parses ai studio url state from query params", () => {
  const state = parseAiStudioUrlState(
    new URLSearchParams(
      "category=music&q=bananas&modelId=music:generate-music",
    ),
    "video",
  );

  assert.deepEqual(state, {
    category: "music",
    search: "bananas",
    modelId: "music:generate-music",
  });
});

test("falls back to defaults when ai studio url state is missing or invalid", () => {
  const state = parseAiStudioUrlState(
    new URLSearchParams("category=unknown&q=&modelId="),
    "image",
  );

  assert.deepEqual(state, {
    category: "image",
    search: "",
    modelId: null,
  });
});

test("builds ai studio query strings while dropping empty values", () => {
  assert.equal(
    buildAiStudioQueryString({
      category: "video",
      search: "sdance",
      modelId: "video:sdance-text-to-video",
    }),
    "category=video&q=sdance&modelId=video%3Asdance-text-to-video",
  );

  assert.equal(
    buildAiStudioQueryString({
      category: "video",
      search: "",
      modelId: null,
    }),
    "category=video",
  );
});

test("collects unique renderable media urls from execution results and raw payloads", () => {
  const urls = collectRenderableMediaUrls(
    [
      "https://cdn.example.com/one.png",
      "http://localhost:3000/api/ai-studio/callback",
    ],
    {
      data: {
        videos: [
          {
            url: "https://cdn.example.com/two.mp4",
          },
        ],
        callBackUrl: "http://localhost:3000/api/ai-studio/callback",
        resultJson:
          "{\"resultUrls\":[\"https://cdn.example.com/four.mp4\"]}",
      },
      nested: {
        audio: "https://cdn.example.com/three.mp3",
      },
    },
  );

  assert.deepEqual([...urls].sort(), [
    "https://cdn.example.com/four.mp4",
    "https://cdn.example.com/one.png",
    "https://cdn.example.com/three.mp3",
    "https://cdn.example.com/two.mp4",
  ]);
});

test("does not re-hydrate local state from stale url params while typing", () => {
  assert.equal(
    shouldHydrateAiStudioUrlState({
      hasHydrated: false,
      incomingQuery: "category=video&q=seedance",
      lastAppliedQuery: "category=video&q=seedan",
    }),
    true,
  );

  assert.equal(
    shouldHydrateAiStudioUrlState({
      hasHydrated: true,
      incomingQuery: "category=video&q=seedan",
      lastAppliedQuery: "category=video&q=seedance",
    }),
    false,
  );
});
