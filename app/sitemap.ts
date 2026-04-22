import { listPublishedPostsAction } from '@/actions/posts/posts'
import { siteConfig } from '@/config/site'
import { DEFAULT_LOCALE, LOCALES } from '@/i18n/routing'
import {
  alternativeCms,
  blogCms,
  compareCms,
  glossaryCms,
  templateCms,
  useCaseCms,
} from '@/lib/cms'
import {
  SEO_SITEMAP_CONTENT_CONFIG,
  type SeoSitemapContentConfig,
  shouldIncludeInSitemap,
} from '@/lib/seo/metadata'
import { MetadataRoute } from 'next'

const siteUrl = siteConfig.url

type ChangeFrequency = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' | undefined
type SitemapEntry = MetadataRoute.Sitemap[number]

type StaticPageConfig = {
  path: string
  priority: number
  changeFrequency: ChangeFrequency
}

// 只维护这个配置即可新增/删除 sitemap 中的静态页面
const STATIC_PAGE_CONFIG: StaticPageConfig[] = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' },
  { path: '/blog', priority: 0.8, changeFrequency: 'daily' },
  { path: '/showcase', priority: 0.85, changeFrequency: 'weekly' },
  { path: '/prompts', priority: 0.8, changeFrequency: 'weekly' },
]

const CMS_MODULES = {
  blog: blogCms,
  glossary: glossaryCms,
  use_case: useCaseCms,
  template: templateCms,
  alternative: alternativeCms,
  compare: compareCms,
} as const

function buildLocalizedUrl(locale: string, path: string) {
  const localePrefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`
  const normalizedPath = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`
  return `${siteUrl}${localePrefix}${normalizedPath}`
}

function normalizeSlug(slug: string | undefined, slugPrefixToTrim: string) {
  if (!slug) return ''
  return slug.replace(/^\//, '').replace(new RegExp(`^${slugPrefixToTrim}`), '')
}

function dedupeSitemapEntries(entries: SitemapEntry[]) {
  const entryMap = new Map<string, SitemapEntry>()

  for (const entry of entries) {
    const existing = entryMap.get(entry.url)
    if (!existing) {
      entryMap.set(entry.url, entry)
      continue
    }

    const existingTime = new Date(existing.lastModified ?? 0).getTime()
    const nextTime = new Date(entry.lastModified ?? 0).getTime()
    if (nextTime >= existingTime) {
      entryMap.set(entry.url, entry)
    }
  }

  return Array.from(entryMap.values())
}

function createEntry(url: string, options: Omit<SitemapEntry, 'url'>): SitemapEntry {
  return {
    url,
    ...options,
  }
}

async function getCmsEntries(locale: string, config: SeoSitemapContentConfig): Promise<SitemapEntry[]> {
  if (!config.includeLocalCms) {
    return []
  }

  const { posts: localPosts } = await CMS_MODULES[config.postType].getLocalList(locale)

  return localPosts
    .filter((post) => post.slug && shouldIncludeInSitemap({
      status: post.status,
      visibility: post.visibility,
    }))
    .map((post) => {
      const slugPart = normalizeSlug(post.slug, config.slugPrefixToTrim)
      if (!slugPart) return null

      return createEntry(buildLocalizedUrl(locale, `${config.routeBase}/${slugPart}`), {
        lastModified: post.metadata?.updatedAt || post.publishedAt || new Date(),
        changeFrequency: config.changeFrequency,
        priority: config.priority,
      })
    })
    .filter((entry): entry is SitemapEntry => Boolean(entry))
}

async function getServerEntries(locale: string, config: SeoSitemapContentConfig): Promise<SitemapEntry[]> {
  const serverResult = await listPublishedPostsAction({
    locale,
    pageSize: 1000,
    visibility: 'public',
    postType: config.postType,
  })

  if (!serverResult.success || !serverResult.data?.posts) {
    return []
  }

  return serverResult.data.posts
    .filter((post) => shouldIncludeInSitemap({
      status: post.status,
      visibility: post.visibility,
    }))
    .map((post) => {
      const slugPart = normalizeSlug(post.slug, config.slugPrefixToTrim)
      if (!slugPart) return null

      return createEntry(buildLocalizedUrl(locale, `${config.routeBase}/${slugPart}`), {
        lastModified: post.publishedAt || new Date(),
        changeFrequency: config.changeFrequency,
        priority: config.priority,
      })
    })
    .filter((entry): entry is SitemapEntry => Boolean(entry))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = LOCALES.flatMap((locale) =>
    STATIC_PAGE_CONFIG.map((page) =>
      createEntry(buildLocalizedUrl(locale, page.path), {
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
      })
    )
  )

  const contentEntries: SitemapEntry[] = []

  for (const config of SEO_SITEMAP_CONTENT_CONFIG) {
    for (const locale of LOCALES) {
      const [cmsEntries, serverEntries] = await Promise.all([
        getCmsEntries(locale, config),
        getServerEntries(locale, config),
      ])
      contentEntries.push(...cmsEntries, ...serverEntries)
    }
  }

  return dedupeSitemapEntries([...staticEntries, ...contentEntries])
}
