import sitemap from "@/app/sitemap";
import { AI_VIDEO_STUDIO_FAMILIES } from "@/config/ai-video-studio";
import { siteConfig } from "@/config/site";
import commonMessagesEn from "@/i18n/messages/en/common.json";
import llmsEn from "@/i18n/messages/en/Llms.json";
import llmsJa from "@/i18n/messages/ja/Llms.json";
import llmsZh from "@/i18n/messages/zh/Llms.json";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/routing";

type SiteMapEntry = Awaited<ReturnType<typeof sitemap>>[number];
type BasicLink = { name: string; href: string };
type DescribedLink = BasicLink & { description: string };

const llmsCopy = {
  en: llmsEn,
  zh: llmsZh,
  ja: llmsJa,
} as const;

function absoluteUrl(href: string) {
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:")
  ) {
    return href;
  }

  if (href.includes("@") && !href.startsWith("mailto:")) {
    return `mailto:${href}`;
  }

  if (href.startsWith("#")) {
    return `${siteConfig.url}/${href}`;
  }

  return `${siteConfig.url}${href.startsWith("/") ? href : `/${href}`}`;
}

function formatLink(name: string, href: string) {
  return `- [${name}](${absoluteUrl(href)})`;
}

function formatDescribedLink(name: string, href: string, description: string) {
  return `- [${name}](${absoluteUrl(href)}) - ${description}`;
}

function formatSitemapUrl(entry: SiteMapEntry) {
  return `- ${entry.url}`;
}

function normalizeUrlForSitemapMatch(url: string) {
  try {
    const parsedUrl = new URL(url);
    const normalizedPathname =
      parsedUrl.pathname === "/"
        ? ""
        : parsedUrl.pathname.replace(/\/$/, "");

    return `${parsedUrl.origin}${normalizedPathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return url.replace(/\/$/, "");
  }
}

function getSitemapUrlSet(entries: SiteMapEntry[]) {
  return new Set(entries.map((entry) => normalizeUrlForSitemapMatch(entry.url)));
}

function getHrefKey(href: string) {
  try {
    const parsedUrl = new URL(absoluteUrl(href));
    return parsedUrl.pathname === "/"
      ? "/"
      : parsedUrl.pathname.replace(/\/$/, "");
  } catch {
    return href === "/" ? "/" : href.replace(/\/$/, "");
  }
}

function isHrefInSitemap(href: string, sitemapUrlSet: Set<string>) {
  return sitemapUrlSet.has(normalizeUrlForSitemapMatch(absoluteUrl(href)));
}

function filterLinksBySitemap<TLink extends BasicLink>(
  links: TLink[],
  sitemapUrlSet: Set<string>,
) {
  return links.filter((link) => isHrefInSitemap(link.href, sitemapUrlSet));
}

function filterLocaleLinksBySitemap<TLink extends BasicLink>(
  links: TLink[],
  locale: string,
  sitemapUrlSet: Set<string>,
) {
  return links.filter((link) =>
    isHrefInSitemap(localizedHref(link.href, locale), sitemapUrlSet)
  );
}

function getCopy(locale: string) {
  return llmsCopy[locale as keyof typeof llmsCopy] ?? llmsCopy.en;
}

function formatTemplate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    values[key] === undefined ? match : String(values[key]),
  );
}

function localizedHref(href: string, locale: string) {
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:")
  ) {
    return href;
  }

  const normalizedHref = href === "/" ? "" : href.startsWith("/") ? href : `/${href}`;
  const localePrefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;

  return `${localePrefix}${normalizedHref || "/"}`;
}

function titleCasePathSegment(segment: string) {
  return segment
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => {
      const upperWord = word.toUpperCase();
      if (["ai", "api", "gpt", "seo", "llm"].includes(word.toLowerCase())) {
        return upperWord;
      }

      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

function getFallbackPageDescription(pageName: string, locale = DEFAULT_LOCALE) {
  const copy = getCopy(locale);

  return formatTemplate(copy.fallbackPageDescription, { pageName });
}

function getSitemapHrefForLocale(entry: SiteMapEntry, locale: string) {
  const pathname = new URL(entry.url).pathname || "/";
  const localePrefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;

  if (locale === DEFAULT_LOCALE) {
    const isOtherLocalePath = LOCALES.some(
      (item) =>
        item !== DEFAULT_LOCALE &&
        (pathname === `/${item}` || pathname.startsWith(`/${item}/`)),
    );

    return isOtherLocalePath ? null : pathname;
  }

  if (pathname === localePrefix) {
    return "/";
  }

  if (!pathname.startsWith(`${localePrefix}/`)) {
    return null;
  }

  return pathname.slice(localePrefix.length) || "/";
}

function isStandaloneSitemapHref(href: string) {
  return href.split("/").filter(Boolean).length <= 1;
}

function getStandaloneSitemapPages(
  entries: SiteMapEntry[],
  locale: string,
): DescribedLink[] {
  return entries
    .map((entry) => getSitemapHrefForLocale(entry, locale))
    .filter((href): href is string => Boolean(href))
    .filter(isStandaloneSitemapHref)
    .map((href) => {
      if (href === "/") {
        const copy = getCopy(locale);
        return {
          name: copy.labels.home,
          href,
          description: copy.descriptions.home,
        };
      }

      const pageName = titleCasePathSegment(href.replace(/^\//, ""));
      return {
        name: pageName,
        href,
        description: getFallbackPageDescription(pageName, locale),
      };
    });
}

function mergeKnownDetailsIntoSitemapPages(
  sitemapPages: DescribedLink[],
  knownPages: DescribedLink[],
) {
  const knownPagesByHref = new Map(
    knownPages.map((page) => [getHrefKey(page.href), page]),
  );
  const seen = new Set<string>();

  return sitemapPages
    .map((page) => knownPagesByHref.get(getHrefKey(page.href)) ?? page)
    .filter((page) => {
      const hrefKey = getHrefKey(page.href);
      if (seen.has(hrefKey)) return false;
      seen.add(hrefKey);
      return true;
    });
}

function isProductApiPage(page: BasicLink) {
  return /(?:^|-)api$/.test(page.href.replace(/\/$/, "").split("/").pop() ?? "");
}

function getUniqueLinks(links: Array<{ name: string; href: string }>) {
  const seen = new Set<string>();

  return links.filter((link) => {
    const key = `${link.name}:${link.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getNavigationLinks() {
  return getUniqueLinks([
    ...commonMessagesEn.Header.links.map((link) => ({
      name: link.name,
      href: link.href,
    })),
    ...commonMessagesEn.Footer.Links.groups.flatMap((group) =>
      group.links.map((link) => ({
        name: link.name,
        href: link.href,
      }))
    ),
  ]);
}

function getSocialLinks() {
  const socialLinkNames: Record<string, string> = {
    discord: "Discord",
    email: "Email",
    github: "GitHub",
    instagram: "Instagram",
    tiktok: "TikTok",
    twitter: "Twitter",
    youtube: "YouTube",
  };

  return Object.entries(siteConfig.socialLinks ?? {})
    .filter(([, value]) => Boolean(value))
    .map(([name, value]) => ({
      name: socialLinkNames[name] ?? name,
      href: value as string,
    }));
}

async function getSitemapEntries() {
  const entries = await sitemap();

  return [...entries].sort((a, b) => {
    if ((b.priority ?? 0) !== (a.priority ?? 0)) {
      return (b.priority ?? 0) - (a.priority ?? 0);
    }

    return a.url.localeCompare(b.url);
  });
}

function getKeyPages() {
  const copy = getCopy(DEFAULT_LOCALE);

  return [
    {
      name: copy.labels.home,
      href: "/",
      description: copy.descriptions.home,
    },
    {
      name: copy.labels.showcase,
      href: "/showcase",
      description: copy.descriptions.showcase,
    },
    {
      name: copy.labels.prompts,
      href: "/prompts",
      description: copy.descriptions.prompts,
    },
    {
      name: copy.labels.pricing,
      href: "/pricing",
      description: copy.descriptions.pricing,
    },
    {
      name: copy.labels.apiDocs,
      href: "/apidoc",
      description: copy.descriptions.apiDocs,
    },
    {
      name: copy.labels.blog,
      href: "/blog",
      description: copy.descriptions.blog,
    },
    {
      name: copy.labels.seedance2,
      href: "/seedance2",
      description: copy.descriptions.seedance2,
    },
    {
      name: copy.labels.seedance2Api,
      href: "/seedance-2-0-api",
      description: copy.descriptions.seedance2Api,
    },
  ];
}

function getLocalizedKeyPages(locale: string) {
  const copy = getCopy(locale);

  return [
    {
      name: copy.labels.home,
      href: "/",
      description: copy.descriptions.home,
    },
    {
      name: copy.labels.showcase,
      href: "/showcase",
      description: copy.descriptions.showcase,
    },
    {
      name: copy.labels.prompts,
      href: "/prompts",
      description: copy.descriptions.prompts,
    },
    {
      name: copy.labels.pricing,
      href: "/pricing",
      description: copy.descriptions.pricing,
    },
    {
      name: copy.labels.apiDocs,
      href: "/apidoc",
      description: copy.descriptions.apiDocs,
    },
    {
      name: copy.labels.blog,
      href: "/blog",
      description: copy.descriptions.blog,
    },
    {
      name: copy.labels.seedance2,
      href: "/seedance2",
      description: copy.descriptions.seedance2,
    },
    {
      name: copy.labels.seedance2Api,
      href: "/seedance-2-0-api",
      description: copy.descriptions.seedance2Api,
    },
  ];
}

function getProductPages(locale = DEFAULT_LOCALE) {
  const copy = getCopy(locale);

  return [
    {
      name: copy.labels.seedance2,
      href: "/seedance2",
      description: copy.descriptions.seedance2,
    },
    {
      name: copy.labels.seedance2Api,
      href: "/seedance-2-0-api",
      description: copy.descriptions.seedance2Api,
    },
    {
      name: copy.labels.seedance15Api,
      href: "/seedance-1-5-api",
      description: copy.descriptions.seedance15Api,
    },
    {
      name: copy.labels.veo31Api,
      href: "/veo-3-1-api",
      description: copy.descriptions.veo31Api,
    },
    {
      name: copy.labels.gptImage2Api,
      href: "/gpt-image-2-api",
      description: copy.descriptions.gptImage2Api,
    },
    {
      name: copy.labels.grokVideoApi,
      href: "/grok-video-api",
      description: copy.descriptions.grokVideoApi,
    },
    {
      name: copy.labels.wanApi,
      href: "/wan-api",
      description: copy.descriptions.wanApi,
    },
  ];
}

function getContentResourcePages(locale = DEFAULT_LOCALE) {
  const copy = getCopy(locale);

  return [
    {
      name: copy.labels.showcase,
      href: "/showcase",
      description: copy.descriptions.showcase,
    },
    {
      name: copy.labels.prompts,
      href: "/prompts",
      description: copy.descriptions.prompts,
    },
    {
      name: copy.labels.blog,
      href: "/blog",
      description: copy.descriptions.blog,
    },
    {
      name: copy.labels.glossary,
      href: "/glossary",
      description: copy.descriptions.glossary,
    },
    {
      name: copy.labels.useCases,
      href: "/use-cases",
      description: copy.descriptions.useCases,
    },
    {
      name: copy.labels.templates,
      href: "/templates",
      description: copy.descriptions.templates,
    },
    {
      name: copy.labels.alternatives,
      href: "/alternatives",
      description: copy.descriptions.alternatives,
    },
    {
      name: copy.labels.compare,
      href: "/compare",
      description: copy.descriptions.compare,
    },
  ];
}

function getModelDocPages(locale = DEFAULT_LOCALE) {
  const copy = getCopy(locale);

  return AI_VIDEO_STUDIO_FAMILIES
    .filter((family) => family.selectable !== false)
    .map((family) => ({
      name: `${family.label} ${copy.apiMarkdown}`,
      href: `/models/${family.key}.md`,
      description:
        locale === DEFAULT_LOCALE
          ? `${family.description}. ${copy.modelDocSuffix}`
          : formatTemplate(copy.nonDefaultModelDocDescription, {
              apiMarkdown: copy.apiMarkdown,
              familyLabel: family.label,
              modelDocSuffix: copy.modelDocSuffix,
            }),
    }));
}

function formatLocaleDescribedLink(page: DescribedLink, locale: string) {
  return formatDescribedLink(
    page.name,
    localizedHref(page.href, locale),
    page.description,
  );
}

function buildLocaleSection(
  locale: string,
  sitemapEntries: SiteMapEntry[],
  sitemapUrlSet: Set<string>,
) {
  const copy = getCopy(locale);
  const localizedSiteUrl = absoluteUrl(localizedHref("/", locale));
  const standaloneSitemapPages = getStandaloneSitemapPages(sitemapEntries, locale);
  const keyPages = filterLocaleLinksBySitemap(
    getLocalizedKeyPages(locale).filter(
      (page) => !["/seedance2", "/seedance-2-0-api"].includes(page.href)
    ),
    locale,
    sitemapUrlSet,
  );
  const productPages = mergeKnownDetailsIntoSitemapPages(
    standaloneSitemapPages.filter(isProductApiPage),
    getProductPages(locale),
  );
  const modelDocPages = filterLocaleLinksBySitemap(
    getModelDocPages(locale),
    locale,
    sitemapUrlSet,
  );
  const contentResourcePages = mergeKnownDetailsIntoSitemapPages(
    standaloneSitemapPages.filter(
      (page) =>
        !isProductApiPage(page) &&
        ![...keyPages, ...productPages].some(
          (item) => getHrefKey(item.href) === getHrefKey(page.href),
        ),
    ),
    getContentResourcePages(locale),
  );

  return [
    `## ${copy.versionTitle}`,
    "",
    `### ${copy.introduction}`,
    "",
    `- ${copy.siteUrl}: ${localizedSiteUrl}`,
    `- ${copy.languagePath}: ${locale === DEFAULT_LOCALE ? "/" : `/${locale}`}`,
    `- ${copy.summaryLabel}: ${copy.summary}`,
    "",
    `### ${copy.keyPages}`,
    "",
    ...keyPages.map((page) =>
      formatLocaleDescribedLink(page, locale)
    ),
    "",
    `### ${copy.productAndApiPages}`,
    "",
    ...productPages.map((page) =>
      formatLocaleDescribedLink(page, locale)
    ),
    "",
    ...(modelDocPages.length
      ? [
          `### ${copy.modelDocs}`,
          "",
          copy.modelDocIntro,
          "",
          ...modelDocPages.map((page) =>
            formatLocaleDescribedLink(page, locale)
          ),
          "",
        ]
      : []),
    ...(contentResourcePages.length
      ? [
          `### ${copy.contentResources}`,
          "",
          ...contentResourcePages.map((page) =>
            formatLocaleDescribedLink(page, locale)
          ),
          "",
        ]
      : []),
  ];
}

export async function buildLlmsText() {
  const sitemapEntries = await getSitemapEntries();
  const sitemapUrlSet = getSitemapUrlSet(sitemapEntries);
  const standaloneSitemapPages = getStandaloneSitemapPages(
    sitemapEntries,
    DEFAULT_LOCALE,
  );
  const knownStandalonePages = [
    ...getKeyPages(),
    ...getProductPages(),
    ...getContentResourcePages(),
  ];
  const navigationLinks = mergeKnownDetailsIntoSitemapPages(
    standaloneSitemapPages,
    [
      ...getNavigationLinks().map((link) => ({
        ...link,
        description: getFallbackPageDescription(link.name),
      })),
      ...knownStandalonePages,
    ],
  );
  const keyPages = mergeKnownDetailsIntoSitemapPages(
    standaloneSitemapPages,
    knownStandalonePages,
  );
  const modelDocPages = filterLinksBySitemap(getModelDocPages(), sitemapUrlSet);

  return [
    `# ${siteConfig.name}`,
    "",
    `> ${siteConfig.description ?? commonMessagesEn.Home.description}`,
    "",
    `Official site: ${siteConfig.url}`,
    `Creator: ${siteConfig.creator}`,
    "",
    "## Summary",
    "",
    commonMessagesEn.Home.description,
    "",
    "## Key Pages",
    "",
    ...keyPages.map((page) =>
      formatDescribedLink(page.name, page.href, page.description)
    ),
    "",
    "## Navigation",
    "",
    ...navigationLinks.slice(0, 12).map((link) => formatLink(link.name, link.href)),
    "",
    ...(modelDocPages.length
      ? [
          "## Model API Docs",
          "",
          ...modelDocPages.map((page) =>
            formatDescribedLink(page.name, page.href, page.description)
          ),
          "",
        ]
      : []),
    "## Languages",
    "",
    formatDescribedLink("English", "/", "Default language."),
    formatDescribedLink("中文", "/zh", "Chinese localized site."),
    formatDescribedLink("日本語", "/ja", "Japanese localized site."),
    "",
    "## More Detail",
    "",
    formatLink("Full LLM reference", "/llms-full.txt"),
    formatLink("XML sitemap", "/sitemap.xml"),
    "",
  ].join("\n");
}

export async function buildLlmsFullText() {
  const sitemapEntries = await getSitemapEntries();
  const sitemapUrlSet = getSitemapUrlSet(sitemapEntries);
  const socialLinks = getSocialLinks();
  const legalPages = filterLinksBySitemap(
    [
      { name: "Privacy Policy", href: "/privacy-policy" },
      { name: "Terms of Service", href: "/terms-of-service" },
      { name: "Refund Policy", href: "/refund-policy" },
    ],
    sitemapUrlSet,
  );
  const localeSections = LOCALES.flatMap((locale) =>
    buildLocaleSection(locale, sitemapEntries, sitemapUrlSet)
  );

  return [
    `# ${siteConfig.name}`,
    "",
    `> ${siteConfig.description ?? commonMessagesEn.Home.description}`,
    "",
    "## Site Metadata",
    "",
    `- Name: ${siteConfig.name}`,
    `- Home title: ${commonMessagesEn.Home.title}`,
    `- Tagline: ${siteConfig.tagLine ?? commonMessagesEn.Home.tagLine}`,
    `- Site URL: ${siteConfig.url}`,
    `- Creator: ${siteConfig.creator}`,
    `- Authors: ${siteConfig.authors.map((author) => `${author.name} (${author.url})`).join(", ")}`,
    "",
    "## Site Summary",
    "",
    commonMessagesEn.Home.description,
    "",
    ...localeSections,
    "",
    "## Languages",
    "",
    formatDescribedLink("English", "/", "Default language."),
    formatDescribedLink("中文", "/zh", "Chinese localized site."),
    formatDescribedLink("日本語", "/ja", "Japanese localized site."),
    "",
    "## Social And Contact",
    "",
    ...(socialLinks.length
      ? socialLinks.map((link) => formatLink(link.name, link.href))
      : ["- No public social links configured."]),
    "",
    ...(legalPages.length
      ? [
          "## Legal Pages",
          "",
          ...legalPages.map((link) => formatLink(link.name, link.href)),
          "",
        ]
      : []),
    "## AI Assistant Notes",
    "",
    "- Use the root URL for English/default pages.",
    "- Use /zh for Chinese pages and /ja for Japanese pages.",
    "- Prefer public pages listed here, /llms.txt, /llms-full.txt, and /sitemap.xml for discovery.",
    "- Do not cite dashboard, admin, private API, webhook, auth, build asset, or internal source paths as public documentation.",
    "",
    "## Public Sitemap URLs",
    "",
    ...sitemapEntries.map(formatSitemapUrl),
    "",
  ].join("\n");
}
