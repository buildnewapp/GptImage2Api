import { DEFAULT_LOCALE } from "@/i18n/routing";
import { loadLocalizedMetadata } from "@/lib/cms/page-data";
import { type RelatedSeoLink, buildRelatedSeoLinks } from "@/lib/seo/content-schema";
import {
  type SeoPageType,
  getSeoPageTypeConfig,
} from "@/lib/seo/page-registry";

type SeoPageMetadataLoader = (input: {
  postType: SeoPageType;
  slug: string;
  locale: string;
}) => Promise<{
  metadata: {
    title: string;
    description: string | null;
    featuredImageUrl: string | null;
    visibility: string;
  } | null;
}>;

export function getSeoPageCmsModule(postType: SeoPageType) {
  // Lazy-load server CMS modules so pure test helpers can run without server-only imports.
  const {
    alternativeCms,
    compareCms,
    templateCms,
    useCaseCms,
  } = require("@/lib/cms") as typeof import("@/lib/cms");

  const SEO_CMS_MODULES = {
    use_case: useCaseCms,
    template: templateCms,
    alternative: alternativeCms,
    compare: compareCms,
  } as const;

  return SEO_CMS_MODULES[postType];
}

export function buildSeoPagePath(input: {
  postType: SeoPageType;
  slug?: string;
}) {
  const config = getSeoPageTypeConfig(input.postType);

  if (!input.slug) {
    return config.routeBase;
  }

  return `${config.routeBase}/${input.slug}`.replace(/\/+/g, "/");
}

export function buildSeoPageOgPath(input: {
  postType: SeoPageType;
  slug: string;
  locale: string;
}) {
  const path = buildSeoPagePath({
    postType: input.postType,
    slug: input.slug,
  });
  const localePrefix =
    input.locale && input.locale !== DEFAULT_LOCALE ? `/${input.locale}` : "";

  return `${localePrefix}${path}/opengraph-image`;
}

export async function resolveSeoPageAvailableLocales(
  input: {
    postType: SeoPageType;
    slug: string;
    locales: string[];
  },
  loadMetadata?: SeoPageMetadataLoader,
) {
  const metadataLoader =
    loadMetadata ??
    (async ({ postType, slug, locale }) =>
      getSeoPageCmsModule(postType).getPostMetadata(slug, locale));
  const { availableLocales } = await loadLocalizedMetadata({
    locales: input.locales,
    currentLocale: input.locales[0] ?? DEFAULT_LOCALE,
    loadMetadata: (locale) =>
      metadataLoader({
        postType: input.postType,
        slug: input.slug,
        locale,
      }),
  });

  return availableLocales;
}

export function buildSeoPageRelatedLinks(input: {
  postType: SeoPageType;
  currentSlug: string;
  posts: Array<{
    slug: string;
    title: string;
    description?: string | null;
    tags?: string | null;
  }>;
}): RelatedSeoLink[] {
  const config = getSeoPageTypeConfig(input.postType);

  return buildRelatedSeoLinks({
    basePath: config.routeBase,
    currentSlug: input.currentSlug,
    posts: input.posts,
  });
}
