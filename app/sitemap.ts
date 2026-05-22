import { siteConfig } from "@/config/site";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/routing";
import { getBlogDataSource } from "@/lib/blog-source";
import {
  alternativeCms,
  blogCms,
  compareCms,
  glossaryCms,
  templateCms,
  useCaseCms,
} from "@/lib/cms";
import {
  SEO_SITEMAP_CONTENT_CONFIG,
  type SeoSitemapContentConfig,
  shouldIncludeInSitemap,
} from "@/lib/seo/metadata";
import { listGeoBlogPosts } from "@/lib/geo/blog";
import { getDb } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { MetadataRoute } from "next";

const siteUrl = siteConfig.url;
export const revalidate = 3600;

type ChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never"
  | undefined;
type SitemapEntry = MetadataRoute.Sitemap[number];

type StaticPageConfig = {
  path: string;
  priority: number;
  changeFrequency: ChangeFrequency;
};

// 只维护这个配置即可新增/删除 sitemap 中的静态页面
const STATIC_PAGE_CONFIG: StaticPageConfig[] = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' },
  { path: '/blog', priority: 0.8, changeFrequency: 'daily' },
  { path: '/showcase', priority: 0.85, changeFrequency: 'weekly' },
  { path: '/prompts', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/pricing', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/apidoc', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/gpt-image-2-api', priority: 0.6, changeFrequency: 'monthly' },
]

const CMS_MODULES = {
  blog: blogCms,
  glossary: glossaryCms,
  use_case: useCaseCms,
  template: templateCms,
  alternative: alternativeCms,
  compare: compareCms,
} as const;

function buildLocalizedUrl(locale: string, path: string) {
  const localePrefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  const normalizedPath =
    path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${localePrefix}${normalizedPath}`;
}

function normalizeSlug(slug: string | undefined, slugPrefixToTrim: string) {
  if (!slug) return "";
  return slug
    .replace(/^\//, "")
    .replace(new RegExp(`^${slugPrefixToTrim}`), "");
}

function dedupeSitemapEntries(entries: SitemapEntry[]) {
  const entryMap = new Map<string, SitemapEntry>();

  for (const entry of entries) {
    const existing = entryMap.get(entry.url);
    if (!existing) {
      entryMap.set(entry.url, entry);
      continue;
    }

    const existingTime = new Date(existing.lastModified ?? 0).getTime();
    const nextTime = new Date(entry.lastModified ?? 0).getTime();
    if (nextTime >= existingTime) {
      entryMap.set(entry.url, entry);
    }
  }

  return Array.from(entryMap.values());
}

function createEntry(
  url: string,
  options: Omit<SitemapEntry, "url">,
): SitemapEntry {
  return {
    url,
    ...options,
  };
}

async function getCmsEntries(
  locale: string,
  config: SeoSitemapContentConfig,
): Promise<SitemapEntry[]> {
  if (config.postType === "blog" && getBlogDataSource() === "geo") {
    return [];
  }

  if (!config.includeLocalCms) {
    return [];
  }

  const { posts: localPosts } =
    await CMS_MODULES[config.postType].getLocalList(locale);

  return localPosts
    .filter(
      (post) =>
        post.slug &&
        shouldIncludeInSitemap({
          status: post.status,
          visibility: post.visibility,
        }),
    )
    .map((post) => {
      const slugPart = normalizeSlug(post.slug, config.slugPrefixToTrim);
      if (!slugPart) return null;

      return createEntry(
        buildLocalizedUrl(locale, `${config.routeBase}/${slugPart}`),
        {
          lastModified:
            post.metadata?.updatedAt || post.publishedAt || new Date(),
          changeFrequency: config.changeFrequency,
          priority: config.priority,
        },
      );
    })
    .filter((entry): entry is SitemapEntry => Boolean(entry));
}

async function getGeoBlogEntries(
  locale: string,
  config: SeoSitemapContentConfig,
): Promise<SitemapEntry[]> {
  const pageSize = 100;
  const entries: SitemapEntry[] = [];
  let pageIndex = 0;
  let total = 0;

  do {
    const result = await listGeoBlogPosts({
      locale,
      pageIndex,
      pageSize,
    });

    total = result.count;
    entries.push(
      ...result.posts
        .filter((post) =>
          shouldIncludeInSitemap({
            status: post.status,
            visibility: post.visibility,
          }),
        )
        .map((post) => {
          const slugPart = normalizeSlug(post.slug, config.slugPrefixToTrim);
          if (!slugPart) return null;

          return createEntry(
            buildLocalizedUrl(locale, `${config.routeBase}/${slugPart}`),
            {
              lastModified: post.publishedAt || new Date(),
              changeFrequency: config.changeFrequency,
              priority: config.priority,
            },
          );
        })
        .filter((entry): entry is SitemapEntry => Boolean(entry)),
    );

    if (result.posts.length === 0) {
      break;
    }

    pageIndex += 1;
  } while (entries.length < total);

  return entries;
}

async function getServerEntries(): Promise<SitemapEntry[]> {
  const configByPostType = new Map(
    SEO_SITEMAP_CONTENT_CONFIG.map((config) => [config.postType, config]),
  );
  const postTypes = SEO_SITEMAP_CONTENT_CONFIG.map(
    (config) => config.postType,
  ).filter((postType) => getBlogDataSource() !== "geo" || postType !== "blog");

  if (postTypes.length === 0) {
    return [];
  }

  const db = getDb();
  const serverPosts = await db
    .select({
      language: posts.language,
      postType: posts.postType,
      slug: posts.slug,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
      status: posts.status,
      visibility: posts.visibility,
    })
    .from(posts)
    .where(
      and(
        eq(posts.status, "published"),
        eq(posts.visibility, "public"),
        inArray(posts.postType, postTypes),
        inArray(posts.language, LOCALES),
      ),
    );

  return serverPosts
    .filter((post) =>
      shouldIncludeInSitemap({
        status: post.status,
        visibility: post.visibility,
      }),
    )
    .map((post) => {
      const config = post.postType
        ? configByPostType.get(post.postType)
        : undefined;
      if (!config) return null;

      const slugPart = normalizeSlug(post.slug, config.slugPrefixToTrim);
      if (!slugPart) return null;

      return createEntry(
        buildLocalizedUrl(post.language, `${config.routeBase}/${slugPart}`),
        {
          lastModified: post.updatedAt || post.publishedAt || new Date(),
          changeFrequency: config.changeFrequency,
          priority: config.priority,
        },
      );
    })
    .filter((entry): entry is SitemapEntry => Boolean(entry));
}

async function getLocalEntries(): Promise<SitemapEntry[]> {
  const entryGroups = await Promise.all(
    SEO_SITEMAP_CONTENT_CONFIG.flatMap((config) =>
      LOCALES.map((locale) => getCmsEntries(locale, config)),
    ),
  );

  return entryGroups.flat();
}

async function getGeoEntries(): Promise<SitemapEntry[]> {
  if (getBlogDataSource() !== "geo") {
    return [];
  }

  const blogConfig = SEO_SITEMAP_CONTENT_CONFIG.find(
    (config) => config.postType === "blog",
  );

  if (!blogConfig) {
    return [];
  }

  const entryGroups = await Promise.all(
    LOCALES.map((locale) => getGeoBlogEntries(locale, blogConfig)),
  );

  return entryGroups.flat();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = LOCALES.flatMap((locale) =>
    STATIC_PAGE_CONFIG.map((page) =>
      createEntry(buildLocalizedUrl(locale, page.path), {
        changeFrequency: page.changeFrequency,
        priority: page.priority,
      }),
    ),
  );

  const [localEntries, serverEntries, geoEntries] = await Promise.all([
    getLocalEntries(),
    getServerEntries(),
    getGeoEntries(),
  ]);

  return dedupeSitemapEntries([
    ...staticEntries,
    ...localEntries,
    ...serverEntries,
    ...geoEntries,
  ]);
}
