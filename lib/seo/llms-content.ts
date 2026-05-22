import sitemap from "@/app/sitemap";
import { AI_VIDEO_STUDIO_FAMILIES } from "@/config/ai-video-studio";
import { siteConfig } from "@/config/site";
import commonMessagesEn from "@/i18n/messages/en/common.json";
import commonMessagesJa from "@/i18n/messages/ja/common.json";
import commonMessagesZh from "@/i18n/messages/zh/common.json";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/routing";

type SiteMapEntry = Awaited<ReturnType<typeof sitemap>>[number];

const llmsCopy = {
  en: {
    apiDocs: "API Docs",
    apiMarkdown: "API Markdown",
    contentResources: "Content Resources",
    introduction: "Introduction",
    keyPages: "Key Pages",
    languagePath: "Language path",
    modelDocIntro:
      "These Markdown API documents are generated dynamically from the AI Studio model configuration. Each document includes the available model IDs, request fields, request examples, pricing rows, and common API errors for that model family.",
    modelDocSuffix:
      "Includes available model IDs, request fields, examples, pricing, and common errors.",
    modelDocs: "Model API Markdown Docs",
    productAndApiPages: "Product And API Pages",
    siteUrl: "Site URL",
    summaryLabel: "Summary",
    summary: commonMessagesEn.Home.description,
    versionTitle: "English Version",
    descriptions: {
      alternatives: "Alternative comparison pages.",
      apiDocs: "Developer documentation for integrating AI video generation.",
      blog: commonMessagesEn.Blogs.description,
      compare: "Side-by-side comparison pages.",
      glossary: "Glossary entries for AI video and product concepts.",
      gptImage2Api: "API access page for GPT Image 2 image generation.",
      grokVideoApi: "API access page for Grok video generation.",
      home: commonMessagesEn.Home.description,
      prompts: "Reusable Seedance 2.0 prompt examples for AI video creation.",
      pricing: "Plans and pricing for the online experience and API service.",
      seedance15Api: "API access page for Seedance 1.5 video generation.",
      seedance2: "Seedance 2.0 video generation product page.",
      seedance2Api: "API access page for Seedance 2.0 video generation.",
      showcase: "Public examples of generated AI videos and creative outputs.",
      templates: "Prompt template and workflow pages.",
      useCases: "AI video generation use case pages.",
      veo31Api: "API access page for Veo 3.1 video generation.",
      wanApi: "API access page for Wan video generation.",
    },
    labels: {
      alternatives: "Alternatives",
      apiDocs: "API Docs",
      blog: "Blog",
      compare: "Compare",
      glossary: "Glossary",
      gptImage2Api: "GPT Image 2 API",
      grokVideoApi: "Grok Video API",
      home: "Home",
      prompts: "Prompts",
      pricing: "Pricing",
      seedance2: "Seedance 2",
      seedance2Api: "Seedance 2 API",
      seedance15Api: "Seedance 1.5 API",
      showcase: "Showcase",
      templates: "Templates",
      useCases: "Use Cases",
      veo31Api: "Veo 3.1 API",
      wanApi: "Wan API",
    },
  },
  ja: {
    apiDocs: "API ドキュメント",
    apiMarkdown: "API Markdown",
    contentResources: "コンテンツリソース",
    introduction: "概要",
    keyPages: "主要ページ",
    languagePath: "言語パス",
    modelDocIntro:
      "これらの Markdown API ドキュメントは AI Studio のモデル設定から動的に生成されます。各ドキュメントには、利用可能なモデル ID、リクエストフィールド、リクエスト例、料金、一般的な API エラーが含まれます。",
    modelDocSuffix:
      "利用可能なモデル ID、リクエストフィールド、例、料金、一般的なエラーを含みます。",
    modelDocs: "モデル API Markdown ドキュメント",
    productAndApiPages: "製品・API ページ",
    siteUrl: "サイト URL",
    summaryLabel: "概要",
    summary: commonMessagesJa.Home.description,
    versionTitle: "日本語版",
    descriptions: {
      alternatives: "代替サービス比較ページ。",
      apiDocs: "AI 動画生成を統合するための開発者向けドキュメント。",
      blog: commonMessagesJa.Blogs.description,
      compare: "ツールやモデルを比較するページ。",
      glossary: "AI 動画と製品概念に関する用語集。",
      gptImage2Api: "GPT Image 2 画像生成 API のページ。",
      grokVideoApi: "Grok 動画生成 API のページ。",
      home: commonMessagesJa.Home.description,
      prompts: "Seedance 2.0 動画作成に再利用できるプロンプト例。",
      pricing: "オンライン体験版と API サービスの料金プラン。",
      seedance15Api: "Seedance 1.5 動画生成 API のページ。",
      seedance2: "Seedance 2.0 動画生成ワークフローの製品ページ。",
      seedance2Api: "Seedance 2.0 動画生成 API のページ。",
      showcase: "生成された AI 動画やクリエイティブ出力の公開例。",
      templates: "プロンプトテンプレートとワークフローページ。",
      useCases: "AI 動画生成のユースケースページ。",
      veo31Api: "Veo 3.1 動画生成 API のページ。",
      wanApi: "Wan 動画生成 API のページ。",
    },
    labels: {
      alternatives: "代替ページ",
      apiDocs: "API ドキュメント",
      blog: "ブログ",
      compare: "比較ページ",
      glossary: "用語集",
      gptImage2Api: "GPT Image 2 API",
      grokVideoApi: "Grok Video API",
      home: "ホーム",
      prompts: "プロンプト",
      pricing: "料金",
      seedance2: "Seedance 2",
      seedance2Api: "Seedance 2 API",
      seedance15Api: "Seedance 1.5 API",
      showcase: "ショーケース",
      templates: "テンプレート",
      useCases: "ユースケース",
      veo31Api: "Veo 3.1 API",
      wanApi: "Wan API",
    },
  },
  zh: {
    apiDocs: "API 文档",
    apiMarkdown: "API Markdown",
    contentResources: "内容资源",
    introduction: "介绍",
    keyPages: "核心页面",
    languagePath: "语言路径",
    modelDocIntro:
      "这些 Markdown API 文档会根据 AI Studio 模型配置动态生成。每个文档包含可用模型 ID、请求字段、请求示例、价格信息和常见 API 错误。",
    modelDocSuffix:
      "包含可用模型 ID、请求字段、示例、价格和常见错误。",
    modelDocs: "模型 API Markdown 文档",
    productAndApiPages: "产品与 API 页面",
    siteUrl: "站点地址",
    summaryLabel: "摘要",
    summary: commonMessagesZh.Home.description,
    versionTitle: "中文版本",
    descriptions: {
      alternatives: "替代方案对比页面。",
      apiDocs: "用于集成 AI 视频生成能力的开发者文档。",
      blog: commonMessagesZh.Blogs.description,
      compare: "工具、模型和工作流的对比页面。",
      glossary: "AI 视频和产品概念术语表。",
      gptImage2Api: "GPT Image 2 图像生成 API 页面。",
      grokVideoApi: "Grok 视频生成 API 页面。",
      home: commonMessagesZh.Home.description,
      prompts: "可复用的 Seedance 2.0 视频创作提示词示例。",
      pricing: "在线体验和 API 服务的套餐与价格。",
      seedance15Api: "Seedance 1.5 视频生成 API 页面。",
      seedance2: "Seedance 2.0 视频生成工作流产品页。",
      seedance2Api: "Seedance 2.0 视频生成 API 页面。",
      showcase: "公开展示的 AI 视频生成案例和创意输出。",
      templates: "提示词模板和工作流页面。",
      useCases: "AI 视频生成应用场景页面。",
      veo31Api: "Veo 3.1 视频生成 API 页面。",
      wanApi: "Wan 视频生成 API 页面。",
    },
    labels: {
      alternatives: "替代方案",
      apiDocs: "API 文档",
      blog: "博客",
      compare: "对比页",
      glossary: "术语表",
      gptImage2Api: "GPT Image 2 API",
      grokVideoApi: "Grok Video API",
      home: "首页",
      prompts: "提示词",
      pricing: "价格",
      seedance2: "Seedance 2",
      seedance2Api: "Seedance 2 API",
      seedance15Api: "Seedance 1.5 API",
      showcase: "作品展示",
      templates: "模板",
      useCases: "应用场景",
      veo31Api: "Veo 3.1 API",
      wanApi: "Wan API",
    },
  },
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

function getCopy(locale: string) {
  return llmsCopy[locale as keyof typeof llmsCopy] ?? llmsCopy.en;
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
          : `${family.label} ${copy.apiMarkdown}。${copy.modelDocSuffix}`,
    }));
}

function formatLocaleDescribedLink(
  page: { name: string; href: string; description: string },
  locale: string,
) {
  return formatDescribedLink(
    page.name,
    localizedHref(page.href, locale),
    page.description,
  );
}

function buildLocaleSection(locale: string) {
  const copy = getCopy(locale);
  const localizedSiteUrl = absoluteUrl(localizedHref("/", locale));
  const keyPages = getLocalizedKeyPages(locale).filter(
    (page) => !["/seedance2", "/seedance-2-0-api"].includes(page.href)
  );
  const productPages = getProductPages(locale);
  const modelDocPages = getModelDocPages(locale);
  const contentResourcePages = getContentResourcePages(locale).filter(
    (page) => ![...keyPages, ...productPages].some((item) => item.href === page.href)
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
    `### ${copy.modelDocs}`,
    "",
    copy.modelDocIntro,
    "",
    ...modelDocPages.map((page) =>
      formatLocaleDescribedLink(page, locale)
    ),
    "",
    `### ${copy.contentResources}`,
    "",
    ...contentResourcePages.map((page) =>
      formatLocaleDescribedLink(page, locale)
    ),
    "",
  ];
}

export async function buildLlmsText() {
  const navigationLinks = getNavigationLinks();
  const keyPages = getKeyPages();
  const modelDocPages = getModelDocPages();

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
    "## Model API Docs",
    "",
    ...modelDocPages.map((page) =>
      formatDescribedLink(page.name, page.href, page.description)
    ),
    "",
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
  const socialLinks = getSocialLinks();
  const localeSections = LOCALES.flatMap((locale) => buildLocaleSection(locale));

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
    "## Legal Pages",
    "",
    formatLink("Privacy Policy", "/privacy-policy"),
    formatLink("Terms of Service", "/terms-of-service"),
    formatLink("Refund Policy", "/refund-policy"),
    "",
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
