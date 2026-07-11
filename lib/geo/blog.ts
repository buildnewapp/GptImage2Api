import "server-only";

import { DEFAULT_LOCALE } from "@/i18n/routing";
import { PostBase, PublicPost } from "@/types/cms";
import { normalizeGeoFileCdnUrls } from "@/lib/geo/file-cdn";

type GeoApiResponse<TData> = {
  success?: boolean;
  data?: TData | null;
  error?: {
    message?: string;
  } | null;
};

type GeoBlogArticle = {
  id?: number;
  title?: string;
  slug?: string;
  language_code?: string;
  language_name?: string;
  source_title_id?: number | null;
  excerpt?: string | null;
  content?: string | null;
  cover_image_url?: string | null;
  keywords?: string | null;
  meta_description?: string | null;
  view_count?: number;
  is_hot?: boolean;
  is_featured?: boolean;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  category?: {
    id?: number;
    name?: string;
    slug?: string;
    description?: string | null;
  } | null;
  author?: {
    id?: number;
    name?: string;
    bio?: string | null;
    avatar?: string | null;
    website?: string | null;
  } | null;
};

type GeoBlogArticleListData = {
  items?: GeoBlogArticle[];
  pagination?: {
    page?: number;
    per_page?: number;
    total?: number;
    total_pages?: number;
  };
};

export type GeoBlogListResult = {
  posts: PublicPost[];
  count: number;
};

export type GeoBlogDetailResult = {
  post: PostBase | null;
};

const GEO_LANGUAGE_BY_LOCALE: Record<string, string> = {
  en: "en",
  zh: "zh",
  ja: "ja",
};

function getGeoLanguageCode(locale: string) {
  return GEO_LANGUAGE_BY_LOCALE[locale] ?? locale ?? DEFAULT_LOCALE;
}

function getGeoApiConfig() {
  const baseUrl = process.env.GEO_API_BASE?.trim().replace(/\/+$/, "");
  const token = process.env.GEO_API_TOKEN?.trim();

  if (!baseUrl || !token) {
    throw new Error("GEO_API_BASE and GEO_API_TOKEN must be configured.");
  }

  return { baseUrl, token };
}

function buildGeoApiUrl(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
) {
  const { baseUrl } = getGeoApiConfig();
  const normalizedPath =
    baseUrl.endsWith("/api/v1") && path.startsWith("/api/v1")
      ? path.replace(/^\/api\/v1/, "")
      : path;
  const url = new URL(`${baseUrl}${normalizedPath}`);

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}

async function fetchGeoApi<TData>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): Promise<TData | null> {
  const { token } = getGeoApiConfig();
  const response = await fetch(buildGeoApiUrl(path, params), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`GeoFlow API request failed: ${response.status}`);
  }

  const payload = (await response.json()) as GeoApiResponse<TData>;
  if (payload.success === false) {
    throw new Error(payload.error?.message || "GeoFlow API request failed.");
  }

  return payload.data ?? null;
}

function parseGeoDate(value: string | null | undefined) {
  if (!value) {
    return new Date();
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getGeoArticleDescription(article: GeoBlogArticle) {
  return article.meta_description || article.excerpt || "";
}

function getGeoArticleTags(article: GeoBlogArticle) {
  const names = [
    article.category?.name,
    ...(article.keywords ?? "")
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean),
  ].filter(Boolean) as string[];

  return Array.from(new Set(names)).join(", ");
}

function normalizeGeoSlug(slug: string | undefined) {
  return (slug ?? "").replace(/^\//, "").replace(/\/$/, "");
}

function mapGeoArticleToPublicPost(
  article: GeoBlogArticle,
  locale: string,
  coverWidth: number | null = null,
): PublicPost {
  const publishedAt = parseGeoDate(article.published_at || article.created_at);

  return {
    id: article.id
      ? `geo-${article.id}`
      : `geo-${normalizeGeoSlug(article.slug)}`,
    language: locale,
    postType: "blog",
    title: article.title || "Untitled",
    slug: normalizeGeoSlug(article.slug),
    description: getGeoArticleDescription(article),
    metadataJsonb: {
      geo: {
        id: article.id ?? null,
        sourceTitleId: article.source_title_id ?? null,
        languageCode: article.language_code ?? null,
        languageName: article.language_name ?? null,
        viewCount: article.view_count ?? null,
        isHot: article.is_hot ?? false,
        category: article.category ?? null,
        author: article.author ?? null,
      },
    },
    featuredImageUrl:
      normalizeGeoFileCdnUrls(article.cover_image_url, coverWidth) || null,
    status: "published",
    visibility: "public",
    isPinned: article.is_featured ?? false,
    publishedAt,
    createdAt: parseGeoDate(article.created_at || article.published_at),
    tags: getGeoArticleTags(article) || null,
  };
}

function mapGeoArticleToPostBase(
  article: GeoBlogArticle,
  locale: string,
): PostBase {
  const publicPost = mapGeoArticleToPublicPost(article, locale);

  return {
    id: publicPost.id,
    locale,
    title: publicPost.title,
    description: publicPost.description ?? "",
    metadataJsonb:
      (publicPost.metadataJsonb as Record<string, unknown>) ?? null,
    featuredImageUrl: publicPost.featuredImageUrl ?? "",
    slug: publicPost.slug,
    tags: publicPost.tags ?? "",
    publishedAt: publicPost.publishedAt,
    status: "published",
    visibility: "public",
    isPinned: publicPost.isPinned,
    content: normalizeGeoFileCdnUrls(article.content),
  };
}

export async function listGeoBlogPosts({
  locale,
  pageIndex = 0,
  pageSize = 48,
}: {
  locale: string;
  pageIndex?: number;
  pageSize?: number;
}): Promise<GeoBlogListResult> {
  const data = await fetchGeoApi<GeoBlogArticleListData>(
    "/api/v1/blog/articles",
    {
      page: pageIndex + 1,
      per_page: pageSize,
      language_code: getGeoLanguageCode(locale),
    },
  );

  const items = data?.items ?? [];

  return {
    posts: items.map((article) =>
      mapGeoArticleToPublicPost(article, locale, 500),
    ),
    count: data?.pagination?.total ?? items.length,
  };
}

export async function getGeoBlogPostBySlug(
  slug: string,
  locale: string = DEFAULT_LOCALE,
): Promise<GeoBlogDetailResult> {
  const article = await fetchGeoApi<GeoBlogArticle>(
    `/api/v1/blog/articles/${encodeURIComponent(slug)}`,
    {
      language_code: getGeoLanguageCode(locale),
    },
  );

  return {
    post: article ? mapGeoArticleToPostBase(article, locale) : null,
  };
}

export async function getGeoBlogPostMetadata(
  slug: string,
  locale: string = DEFAULT_LOCALE,
) {
  const { post } = await getGeoBlogPostBySlug(slug, locale);

  if (!post) {
    return { metadata: null };
  }

  return {
    metadata: {
      title: post.title,
      description: post.description || null,
      featuredImageUrl: post.featuredImageUrl || null,
      visibility: post.visibility || "public",
    },
  };
}
