import { siteConfig } from "@/config/site";
import { DEFAULT_LOCALE, LOCALE_TO_HREFLANG } from "@/i18n/routing";
import { PostType } from "@/lib/db/schema";
import { SEO_PAGE_TYPE_CONFIGS } from "@/lib/seo/page-registry";

export type SeoSitemapContentConfig = {
  postType: Extract<
    PostType,
    "blog" | "glossary" | "use_case" | "template" | "alternative" | "compare"
  >;
  routeBase: string;
  slugPrefixToTrim: string;
  includeLocalCms?: boolean;
  priority: number;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
};

export const SEO_SITEMAP_CONTENT_CONFIG: SeoSitemapContentConfig[] = [
  {
    postType: "blog",
    routeBase: "/blog",
    slugPrefixToTrim: "blogs/",
    includeLocalCms: true,
    priority: 0.7,
    changeFrequency: "daily",
  },
  {
    postType: "glossary",
    routeBase: "/glossary",
    slugPrefixToTrim: "",
    priority: 0.65,
    changeFrequency: "weekly",
  },
  ...SEO_PAGE_TYPE_CONFIGS.map((config) => ({
    postType: config.postType,
    routeBase: config.routeBase,
    slugPrefixToTrim: "",
    priority: config.priority,
    changeFrequency: config.changeFrequency,
  })),
];

export function buildCanonicalUrl(input: {
  locale: string;
  path: string;
}) {
  const normalizedPath =
    input.path === "/"
      ? ""
      : input.path.startsWith("/")
        ? input.path
        : `/${input.path}`;
  const localePrefix = input.locale === DEFAULT_LOCALE ? "" : `/${input.locale}`;

  return `${siteConfig.url}${localePrefix}${normalizedPath}`;
}

export function buildAlternateLanguageUrls(
  canonicalPath: string | undefined,
  locales: string[],
) {
  const path = canonicalPath === "/" ? "" : canonicalPath || "";

  const languages = locales.reduce(
    (acc, locale) => {
      const hrefLang = LOCALE_TO_HREFLANG[locale] || locale;
      acc[hrefLang] = buildCanonicalUrl({ locale, path: path || "/" });
      return acc;
    },
    {} as Record<string, string>,
  );

  languages["x-default"] = `${siteConfig.url}${path}`;

  return languages;
}

export function shouldNoIndexContent(input: {
  status?: string | null;
  visibility?: string | null;
}) {
  return input.status !== "published" || input.visibility !== "public";
}

export function shouldIncludeInSitemap(input: {
  status?: string | null;
  visibility?: string | null;
}) {
  return !shouldNoIndexContent(input);
}
