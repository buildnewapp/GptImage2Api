type MetadataLookupResult<TMetadata> = {
  metadata: TMetadata | null;
};

export async function loadLocalizedMetadata<TMetadata>({
  locales,
  currentLocale,
  loadMetadata,
}: {
  locales: string[];
  currentLocale: string;
  loadMetadata: (locale: string) => Promise<MetadataLookupResult<TMetadata>>;
}) {
  const results = await Promise.all(
    locales.map(async (locale) => ({
      locale,
      ...(await loadMetadata(locale)),
    })),
  );

  return {
    currentMetadata:
      results.find((item) => item.locale === currentLocale)?.metadata ?? null,
    availableLocales: results
      .filter((item) => item.metadata !== null)
      .map((item) => item.locale),
  };
}

type PostsActionResult<TPost> = {
  success: boolean;
  data?: {
    posts?: TPost[];
    count?: number;
  };
  error?: string;
};

type TagsActionResult<TTag> = {
  success: boolean;
  data?: {
    tags?: TTag[];
  };
};

type LocalPostsResult<TLocalPost> = {
  posts: TLocalPost[];
};

export async function loadPublicListPageData<TPost, TTag, TLocalPost>({
  fetchPosts,
  fetchTags,
  fetchLocalPosts,
}: {
  fetchPosts: () => Promise<PostsActionResult<TPost>>;
  fetchTags: () => Promise<TagsActionResult<TTag>>;
  fetchLocalPosts?: () => Promise<LocalPostsResult<TLocalPost>>;
}) {
  const [postsResult, tagsResult, localPostsResult] = await Promise.all([
    fetchPosts(),
    fetchTags(),
    fetchLocalPosts ? fetchLocalPosts() : Promise.resolve({ posts: [] as TLocalPost[] }),
  ]);

  return {
    posts:
      postsResult.success && postsResult.data?.posts ? postsResult.data.posts : [],
    total:
      postsResult.success && postsResult.data?.count ? postsResult.data.count : 0,
    tags: tagsResult.success && tagsResult.data?.tags ? tagsResult.data.tags : [],
    localPosts: localPostsResult.posts,
    postsError: postsResult.success ? undefined : postsResult.error,
  };
}
