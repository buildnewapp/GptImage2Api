import { siteConfig } from "@/config/site";

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

export const API_DOCS_SLUGS = [
  "api",
  "api-authentication",
  "api-generate",
  "api-models",
  "api-task-status",
  "api-history",
  "api-billing",
] as const;

export const DOCS_SLUGS = ["getting-started", ...API_DOCS_SLUGS] as const;

export type DocsSlug = (typeof DOCS_SLUGS)[number];
export type ApiDocsSlug = (typeof API_DOCS_SLUGS)[number];

const DOCS_COPY = {
  en: {
    center: "Documentation",
    title: `${siteConfig.name} documentation`,
    description: `Learn the core ${siteConfig.name} workflow and find practical guidance as the documentation grows.`,
    groupTitle: "Getting started",
    apiGroupTitle: "API documentation",
    search: "Search documentation",
    searchShortcut: "⌘K",
    noResults: "No matching documentation",
    menu: "Documentation menu",
    back: "Documentation home",
    viewGuide: "Read guide",
  },
  zh: {
    center: "文档中心",
    title: `${siteConfig.name} 文档中心`,
    description: `从核心使用流程开始了解 ${siteConfig.name}，后续文档将持续补充到这里。`,
    groupTitle: "快速开始",
    apiGroupTitle: "API 文档",
    search: "搜索文档",
    searchShortcut: "⌘K",
    noResults: "没有找到匹配的文档",
    menu: "文档目录",
    back: "文档中心首页",
    viewGuide: "查看文档",
  },
  ja: {
    center: "ドキュメント",
    title: `${siteConfig.name} ドキュメント`,
    description: `${siteConfig.name} の基本的なワークフローから始め、今後追加されるガイドを確認できます。`,
    groupTitle: "はじめに",
    apiGroupTitle: "API ドキュメント",
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
  api: {
    en: {
      title: "API overview",
      description:
        "Understand the API workflow, base URL, and available endpoints.",
    },
    zh: {
      title: "API 概览",
      description: "了解 API 接入流程、基础地址和可用接口。",
    },
    ja: {
      title: "API 概要",
      description:
        "API の利用フロー、ベース URL、利用可能なエンドポイントを確認します。",
    },
  },
  "api-authentication": {
    en: {
      title: "Authentication and account",
      description:
        "Create an API key, authenticate requests, and read account details.",
    },
    zh: {
      title: "鉴权与账户",
      description: "创建 API Key、完成请求鉴权并读取账户信息。",
    },
    ja: {
      title: "認証とアカウント",
      description:
        "API キーの作成、リクエスト認証、アカウント情報の取得方法です。",
    },
  },
  "api-generate": {
    en: {
      title: "Create a generation",
      description:
        "Submit an AI Studio generation request with a model and payload.",
    },
    zh: {
      title: "发起生成任务",
      description: "使用模型 ID 和 payload 提交 AI Studio 生成请求。",
    },
    ja: {
      title: "生成タスクを作成",
      description:
        "モデル ID と payload を使って AI Studio の生成を開始します。",
    },
  },
  "api-models": {
    en: {
      title: "Models and payload fields",
      description:
        "Browse model IDs and inspect the live payload schema for each model.",
    },
    zh: {
      title: "模型与请求字段",
      description: "查看模型 ID，并读取每个模型的实时 payload Schema。",
    },
    ja: {
      title: "モデルと payload フィールド",
      description:
        "モデル ID と各モデルの最新 payload schema を確認します。",
    },
  },
  "api-task-status": {
    en: {
      title: "Task status",
      description:
        "Poll a generation task and handle queued, running, succeeded, and failed states.",
    },
    zh: {
      title: "查询任务状态",
      description: "轮询生成任务，并处理排队、运行、成功和失败状态。",
    },
    ja: {
      title: "タスク状態を確認",
      description:
        "生成タスクをポーリングし、待機・実行・成功・失敗を処理します。",
    },
  },
  "api-history": {
    en: {
      title: "Generation history",
      description:
        "Read paginated generation history with status and keyword filters.",
    },
    zh: {
      title: "生成历史",
      description: "分页读取生成记录，并使用状态和关键词筛选。",
    },
    ja: {
      title: "生成履歴",
      description:
        "ステータスやキーワードで絞り込みながら生成履歴を取得します。",
    },
  },
  "api-billing": {
    en: {
      title: "Billing and FAQ",
      description:
        "Learn how API credits are charged and review common integration questions.",
    },
    zh: {
      title: "计费与常见问题",
      description: "了解 API 积分计费方式和常见接入问题。",
    },
    ja: {
      title: "料金とよくある質問",
      description:
        "API クレジットの課金方法と一般的な接続質問を確認します。",
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
    {
      title: copy.apiGroupTitle,
      items: API_DOCS_SLUGS.map((slug) => {
        const item = getDocsItem(locale, slug);

        return {
          slug,
          title: item.title,
          description: item.description,
          href: `/docs/${slug}`,
        };
      }),
    },
  ];
}

export function isDocsSlug(value: string): value is DocsSlug {
  return DOCS_SLUGS.includes(value as DocsSlug);
}

export function isApiDocsSlug(value: DocsSlug): value is ApiDocsSlug {
  return API_DOCS_SLUGS.includes(value as ApiDocsSlug);
}
