"use client";

import { Check, Copy, FileText, Languages, Sparkles, X } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  cardHeadingClass,
  displayTitleClass,
  pageShellClass,
  sectionKickerClass,
} from "@/components/home/video/constants";
import promptsJson from "@/content/prompts.json";

type PromptLanguage = "en" | "zh" | "ja" | "ko";

type PromptMedia = {
  type: string;
  url: string;
  thumbnail: string;
  sourceUrl: string;
};

type PromptItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  prompt: string;
  language: PromptLanguage;
  featured: boolean;
  authorName: string;
  authorUrl: string;
  sourceUrl: string;
  publishedAt: string;
  tags: string[];
  media: PromptMedia[];
};

type PromptData = {
  source: string;
  fetchedAt: string;
  total: number;
  items: PromptItem[];
};

type LocaleUI = "en" | "zh" | "ja";

const PAGE_SIZE = 24;
const ALL_PROMPTS = (promptsJson as PromptData).items;
const PRODUCT_TITLE = "GptImage2Api – Fast & Reliable GPT Image 2 API for Developers";
const PRODUCT_DESCRIPTION =
  "GptImage2Api provides powerful GPT Image 2 API access for developers, startups, and businesses to generate high-quality AI images with simple REST endpoints. Build image generation apps, automate creative workflows, and integrate GPT Image 2 API into your products instantly.";

const LOCALE_TO_LANGUAGE: Record<string, PromptLanguage> = {
  en: "en",
  zh: "zh",
  ja: "ja",
};

const LANGUAGE_LABELS: Record<PromptLanguage, string> = {
  en: "English",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
};

const UI_TEXT: Record<
  LocaleUI,
  {
    subtitle: string;
    language: string;
    total: string;
    page: string;
    prev: string;
    next: string;
    details: string;
    close: string;
    prompt: string;
    copy: string;
    copied: string;
    description: string;
    author: string;
    source: string;
    noData: string;
  }
> = {
  zh: {
    subtitle: PRODUCT_DESCRIPTION,
    language: "语言",
    total: "总数",
    page: "页码",
    prev: "上一页",
    next: "下一页",
    details: "查看详情",
    close: "关闭",
    prompt: "提示词",
    copy: "复制",
    copied: "已复制",
    description: "描述",
    author: "作者",
    source: "来源",
    noData: "当前语言暂无提示词",
  },
  en: {
    subtitle: PRODUCT_DESCRIPTION,
    language: "Language",
    total: "Total",
    page: "Page",
    prev: "Previous",
    next: "Next",
    details: "View Details",
    close: "Close",
    prompt: "Prompt",
    copy: "Copy",
    copied: "Copied",
    description: "Description",
    author: "Author",
    source: "Source",
    noData: "No prompts for this language",
  },
  ja: {
    subtitle: PRODUCT_DESCRIPTION,
    language: "言語",
    total: "合計",
    page: "ページ",
    prev: "前へ",
    next: "次へ",
    details: "詳細を見る",
    close: "閉じる",
    prompt: "プロンプト",
    copy: "コピー",
    copied: "コピー済み",
    description: "説明",
    author: "作者",
    source: "ソース",
    noData: "この言語にはプロンプトがありません",
  },
};

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableShuffle(items: PromptItem[], seed: string): PromptItem[] {
  return [...items].sort((a, b) => {
    const ah = hashString(`${seed}:${a.id}`);
    const bh = hashString(`${seed}:${b.id}`);

    if (ah === bh) {
      return a.id.localeCompare(b.id);
    }

    return ah - bh;
  });
}

function resolveLocaleUI(locale: string): LocaleUI {
  if (locale === "zh" || locale === "ja") {
    return locale;
  }

  return "en";
}

export default function PromptsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const uiLocale = resolveLocaleUI(locale);
  const text = UI_TEXT[uiLocale];

  const defaultLanguage = LOCALE_TO_LANGUAGE[locale] ?? "en";
  const [selectedPrompt, setSelectedPrompt] = useState<PromptItem | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyPrompt = async (
    prompt: string,
    key: string,
    event?: MouseEvent<HTMLButtonElement>,
  ) => {
    event?.stopPropagation();

    if (!prompt) {
      return;
    }

    await navigator.clipboard.writeText(prompt);
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current));
    }, 2000);
  };

  const activeLanguage = useMemo(() => {
    const language = searchParams.get("lang");
    if (language === "en" || language === "zh" || language === "ja" || language === "ko") {
      return language;
    }
    return defaultLanguage;
  }, [defaultLanguage, searchParams]);

  const currentPage = useMemo(() => {
    const rawPage = Number(searchParams.get("page") ?? "1");
    if (Number.isFinite(rawPage) && rawPage >= 1) {
      return Math.floor(rawPage);
    }
    return 1;
  }, [searchParams]);

  const languageCounts = useMemo(() => {
    const counts: Record<PromptLanguage, number> = {
      en: 0,
      zh: 0,
      ja: 0,
      ko: 0,
    };

    for (const item of ALL_PROMPTS) {
      counts[item.language] += 1;
    }

    return counts;
  }, []);

  const filteredPrompts = useMemo(() => {
    const byLanguage = ALL_PROMPTS.filter(
      (item) => item.language === activeLanguage,
    );
    return stableShuffle(byLanguage, activeLanguage);
  }, [activeLanguage]);

  const totalPages = Math.max(1, Math.ceil(filteredPrompts.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredPrompts.slice(start, start + PAGE_SIZE);
  }, [filteredPrompts, safePage]);

  const buildPageHref = (language: PromptLanguage, page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (language === defaultLanguage) {
      params.delete("lang");
    } else {
      params.set("lang", language);
    }

    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }

    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  useEffect(() => {
    if (safePage !== currentPage) {
      router.replace(buildPageHref(activeLanguage, safePage), { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage, currentPage, activeLanguage]);

  return (
    <div className={`${pageShellClass} min-h-screen`}>
      <section className="px-3 pb-8 pt-20 sm:px-6 sm:pb-10 sm:pt-24 lg:px-8 lg:pb-14 lg:pt-32">
        <div className="mx-auto w-full max-w-7xl">
          <div className={sectionKickerClass}>
            <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
            GPT Image 2 API
          </div>

          <h1
            className={`${displayTitleClass} mt-5 max-w-4xl text-[clamp(2.3rem,13vw,5.8rem)] leading-[0.96] text-slate-950 dark:text-white sm:leading-[0.99]`}
          >
            {PRODUCT_TITLE}
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg sm:leading-8">
            {text.subtitle}
          </p>

          <div className="mt-6 grid gap-3 rounded-[calc(var(--radius)+0.5rem)] border border-slate-200/80 bg-white/75 p-4 shadow-[0_18px_55px_-36px_rgba(15,23,42,0.25)] dark:border-white/10 dark:bg-white/[0.04] sm:grid-cols-3">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Languages className="h-4 w-4 text-[hsl(var(--primary))]" />
              <span>{text.language}</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {LANGUAGE_LABELS[activeLanguage]}
              </span>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              {text.total}: {filteredPrompts.length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              {text.page}: {safePage}/{totalPages}
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-20 z-20 border-y border-slate-200/70 bg-[color-mix(in_srgb,hsl(var(--background))_78%,white_22%)]/80 backdrop-blur-2xl dark:border-white/10 dark:bg-[color-mix(in_srgb,hsl(var(--background))_82%,black_18%)]/78">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 overflow-x-auto px-3 py-3 sm:px-6 lg:px-8">
          {(Object.keys(LANGUAGE_LABELS) as PromptLanguage[]).map((language) => {
            const isActive = language === activeLanguage;
            return (
              <button
                key={language}
                type="button"
                onClick={() => router.push(buildPageHref(language, 1))}
                className={`min-h-11 flex-none rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 ${
                  isActive
                    ? "bg-[linear-gradient(135deg,#2d6cdf_0%,#39a7d8_100%)] text-white shadow-[0_18px_32px_-24px_rgba(59,130,246,0.52)]"
                    : "border border-slate-200/80 bg-white/80 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08]"
                }`}
              >
                {LANGUAGE_LABELS[language]} ({languageCounts[language]})
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-3 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <div className="mx-auto w-full max-w-7xl">
          {pageItems.length === 0 ? (
            <div className="rounded-[calc(var(--radius)+0.45rem)] border border-slate-200/80 bg-white/75 p-8 text-center text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              {text.noData}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {pageItems.map((item) => {
                const cover = item.media[0]?.url;

                return (
                  <article
                    key={item.id}
                    className="flex h-full cursor-pointer flex-col rounded-[calc(var(--radius)+0.35rem)] border border-slate-200/80 bg-white/90 p-4 shadow-[0_24px_72px_-48px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.04]"
                    onClick={() => setSelectedPrompt(item)}
                  >
                    {cover ? (
                      <img
                        src={cover}
                        alt={item.title}
                        className="h-44 w-full rounded-2xl object-cover"
                        loading="lazy"
                      />
                    ) : null}

                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {item.description}
                    </p>

                    <div className="mt-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-slate-900/40">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          <FileText className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                          {text.prompt}
                        </div>
                        <button
                          type="button"
                          onClick={(event) =>
                            void handleCopyPrompt(item.prompt, `list-${item.id}`, event)
                          }
                          className="inline-flex h-8 items-center gap-1 rounded-full border border-slate-200/80 bg-white/90 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.1]"
                        >
                          {copiedKey === `list-${item.id}` ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {copiedKey === `list-${item.id}` ? text.copied : text.copy}
                        </button>
                      </div>
                      <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200">
                        {item.prompt}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{item.authorName}</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedPrompt(item);
                        }}
                        className="inline-flex h-8 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.1]"
                      >
                        {text.details}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() =>
                router.push(buildPageHref(activeLanguage, Math.max(1, safePage - 1)))
              }
              disabled={safePage <= 1}
              className="min-h-11 rounded-full border border-slate-200/80 bg-white/80 px-5 py-2 text-sm font-semibold text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
            >
              {text.prev}
            </button>

            <div className="rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              {text.page}: {safePage}/{totalPages}
            </div>

            <button
              type="button"
              onClick={() => router.push(buildPageHref(activeLanguage, Math.min(totalPages, safePage + 1)))}
              disabled={safePage >= totalPages}
              className="min-h-11 rounded-full border border-slate-200/80 bg-white/80 px-5 py-2 text-sm font-semibold text-slate-600 transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
            >
              {text.next}
            </button>
          </div>
        </div>
      </section>

      {selectedPrompt &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 animate-in fade-in duration-200">
            <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
              <button
                type="button"
                onClick={() => setSelectedPrompt(null)}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700"
                aria-label={text.close}
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className={`${cardHeadingClass} pr-12 text-slate-900`}>
                {selectedPrompt.title}
              </h3>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="rounded-full border border-slate-300 px-3 py-1">
                  {LANGUAGE_LABELS[selectedPrompt.language]}
                </span>
                <span className="rounded-full border border-slate-300 px-3 py-1">
                  {text.author}: {selectedPrompt.authorName}
                </span>
                <a
                  href={selectedPrompt.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-slate-300 px-3 py-1 hover:bg-slate-100"
                >
                  {text.source}
                </a>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {text.description}
                  </p>
                  <p className="text-base leading-8 text-slate-800">
                    {selectedPrompt.description}
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {text.prompt}
                    </p>
                    <button
                      type="button"
                      onClick={(event) =>
                        void handleCopyPrompt(
                          selectedPrompt.prompt,
                          `detail-${selectedPrompt.id}`,
                          event,
                        )
                      }
                      className="inline-flex h-9 items-center gap-1 rounded-full border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      {copiedKey === `detail-${selectedPrompt.id}` ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedKey === `detail-${selectedPrompt.id}` ? text.copied : text.copy}
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap rounded-2xl border border-slate-300 bg-slate-100 p-4 text-base leading-8 text-slate-900">
                    {selectedPrompt.prompt}
                  </pre>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {selectedPrompt.media.map((media, index) => {
                    if (media.type === "video") {
                      return (
                        <video
                          key={`${selectedPrompt.id}-video-${index}`}
                          src={media.url}
                          controls
                          className="w-full rounded-2xl border border-slate-300"
                        />
                      );
                    }

                    return (
                      <img
                        key={`${selectedPrompt.id}-image-${index}`}
                        src={media.url}
                        alt={`${selectedPrompt.title}-${index + 1}`}
                        className="w-full rounded-2xl border border-slate-300"
                        loading="lazy"
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              className="absolute inset-0 -z-10"
              onClick={() => setSelectedPrompt(null)}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
