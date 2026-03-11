import assert from "node:assert/strict";
import test from "node:test";

import {
  loadLocalizedMetadata,
  loadPublicListPageData,
} from "@/lib/cms/page-data";

test("loadLocalizedMetadata returns current metadata and available locales", async () => {
  const result = await loadLocalizedMetadata({
    locales: ["en", "zh", "ja"],
    currentLocale: "zh",
    loadMetadata: async (locale) => ({
      metadata:
        locale === "ja"
          ? null
          : {
              title: locale.toUpperCase(),
            },
    }),
  });

  assert.deepEqual(result.availableLocales, ["en", "zh"]);
  assert.deepEqual(result.currentMetadata, { title: "ZH" });
});

test("loadPublicListPageData combines posts, tags, and optional local posts", async () => {
  const result = await loadPublicListPageData({
    fetchLocalPosts: async () => ({
      posts: [{ slug: "local-post" }],
    }),
    fetchPosts: async () => ({
      success: true,
      data: {
        posts: [{ slug: "remote-post" }],
        count: 3,
      },
    }),
    fetchTags: async () => ({
      success: true,
      data: {
        tags: [{ id: "tag-1", name: "Featured" }],
      },
    }),
  });

  assert.deepEqual(result.localPosts, [{ slug: "local-post" }]);
  assert.deepEqual(result.posts, [{ slug: "remote-post" }]);
  assert.equal(result.total, 3);
  assert.deepEqual(result.tags, [{ id: "tag-1", name: "Featured" }]);
  assert.equal(result.postsError, undefined);
});

test("loadPublicListPageData preserves errors while returning safe defaults", async () => {
  const result = await loadPublicListPageData({
    fetchPosts: async () => ({
      success: false,
      error: "boom",
    }),
    fetchTags: async () => ({
      success: false,
      error: "tags failed",
    }),
  });

  assert.deepEqual(result.localPosts, []);
  assert.deepEqual(result.posts, []);
  assert.equal(result.total, 0);
  assert.deepEqual(result.tags, []);
  assert.equal(result.postsError, "boom");
});
