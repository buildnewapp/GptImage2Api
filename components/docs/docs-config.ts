export type DocsLocale = "en" | "zh" | "ja";

export type DocsNavItem = {
  slug: DocsSlug;
  title: string;
  description: string;
  href: string;
};

export type DocsNavGroup = {
  title: string;
  items: DocsNavItem[];
};

export const DOCS_SLUGS = ["getting-started"] as const;

export type DocsSlug = (typeof DOCS_SLUGS)[number];

const DOCS_COPY = {
  en: {
    center: "Documentation",
    title: "Sdance AI documentation",
    description:
      "Learn the core Sdance AI workflow and find practical guidance as the documentation grows.",
    groupTitle: "Getting started",
    search: "Search documentation",
    searchShortcut: "⌘K",
    noResults: "No matching documentation",
    menu: "Documentation menu",
    back: "Documentation home",
    viewGuide: "Read guide",
  },
  zh: {
    center: "文档中心",
    title: "Sdance AI 文档中心",
    description:
      "从核心使用流程开始了解 Sdance AI，后续文档将持续补充到这里。",
    groupTitle: "快速开始",
    search: "搜索文档",
    searchShortcut: "⌘K",
    noResults: "没有找到匹配的文档",
    menu: "文档目录",
    back: "文档中心首页",
    viewGuide: "查看文档",
  },
  ja: {
    center: "ドキュメント",
    title: "Sdance AI ドキュメント",
    description:
      "Sdance AI の基本的なワークフローから始め、今後追加されるガイドを確認できます。",
    groupTitle: "はじめに",
    search: "ドキュメントを検索",
    searchShortcut: "⌘K",
    noResults: "一致するドキュメントがありません",
    menu: "ドキュメントメニュー",
    back: "ドキュメントのトップ",
    viewGuide: "ガイドを読む",
  },
} as const;

const DOCS_ITEM_COPY: Record<
  DocsSlug,
  Record<DocsLocale, { title: string; description: string }>
> = {
  "getting-started": {
    en: {
      title: "Quick start",
      description:
        "Create your first AI video and learn the basic generation workflow.",
    },
    zh: {
      title: "快速开始",
      description: "创建第一个 AI 视频，了解基础生成流程。",
    },
    ja: {
      title: "クイックスタート",
      description: "最初の AI 動画を作成し、基本的な生成手順を学びます。",
    },
  },
};

export function getDocsLocale(locale: string): DocsLocale {
  return locale === "zh" || locale === "ja" ? locale : "en";
}

export function getDocsCopy(locale: string) {
  return DOCS_COPY[getDocsLocale(locale)];
}

export function getDocsItem(locale: string, slug: DocsSlug) {
  return DOCS_ITEM_COPY[slug][getDocsLocale(locale)];
}

export function getDocsNavigation(locale: string): DocsNavGroup[] {
  const copy = getDocsCopy(locale);
  const gettingStarted = getDocsItem(locale, "getting-started");

  return [
    {
      title: copy.groupTitle,
      items: [
        {
          slug: "getting-started",
          title: gettingStarted.title,
          description: gettingStarted.description,
          href: "/docs/getting-started",
        },
      ],
    },
  ];
}

export function isDocsSlug(value: string): value is DocsSlug {
  return DOCS_SLUGS.includes(value as DocsSlug);
}
