import { siteConfig } from '@/config/site'
import { DEFAULT_LOCALE, LOCALE_NAMES, Locale } from '@/i18n/routing'
import { buildAlternateLanguageUrls, buildCanonicalUrl } from '@/lib/seo/metadata'
import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

type MetadataProps = {
  page?: string // legacy
  title?: string
  description?: string
  images?: string[] | undefined
  noIndex?: boolean
  locale?: Locale
  path?: string
  canonicalUrl?: string
  availableLocales?: string[]
  useDefaultOgImage?: boolean
}

export async function constructMetadata({
  title,
  description,
  images,
  noIndex = false,
  locale,
  path,
  canonicalUrl,
  availableLocales,
  useDefaultOgImage = true,
}: MetadataProps): Promise<Metadata> {
  const t = await getTranslations({ locale: locale || DEFAULT_LOCALE, namespace: 'Home' })

  const pageTitle = title || t(`title`)
  const pageTagLine = t(`tagLine`)
  const pageDescription = description || t(`description`)

  const finalTitle = path === '/'
    ? `${pageTitle} - ${pageTagLine}`
    : `${pageTitle} | ${siteConfig.name}`

  canonicalUrl = canonicalUrl || path

  const locales = availableLocales || Object.keys(LOCALE_NAMES)
  const alternateLanguages = buildAlternateLanguageUrls(canonicalUrl, locales)

  const imageUrls = images && images.length > 0
    ? images.map(img => ({
      url: img.startsWith('http') ? img : `${siteConfig.url}/${img}`,
      alt: pageTitle,
    }))
    : useDefaultOgImage
      ? [{
        url: `${siteConfig.url}/og.png`,
        alt: pageTitle,
      }]
      : undefined
  const pageURL = `${locale === DEFAULT_LOCALE ? '' : `/${locale}`}${path}`

  return {
    title: finalTitle,
    description: pageDescription,
    keywords: [],
    authors: siteConfig.authors,
    creator: siteConfig.creator,
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: canonicalUrl
        ? buildCanonicalUrl({
            locale: locale || DEFAULT_LOCALE,
            path: canonicalUrl,
          })
        : undefined,
      languages: alternateLanguages,
    },
    // Create an OG image using https://myogimage.com/
    openGraph: {
      type: 'website',
      title: finalTitle,
      description: pageDescription,
      url: pageURL,
      siteName: t('title'),
      locale: locale,
      ...(imageUrls && { images: imageUrls }),
    },
    twitter: {
      card: 'summary_large_image',
      title: finalTitle,
      description: pageDescription,
      site: `${siteConfig.url}${pageURL === '/' ? '' : pageURL}`,
      ...(imageUrls && { images: imageUrls }),
      creator: siteConfig.creator,
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
      },
    },
  }
}
