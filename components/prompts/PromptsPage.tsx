"use client";

import {
  AudioLines,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  ImageIcon,
  Search,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type MouseEvent } from "react";

import {
  displayTitleClass,
  pageShellClass,
  sectionKickerClass,
} from "@/components/home/video/constants";
import type { PromptGalleryItem } from "@/lib/prompt-gallery-shared";

import {
  getPromptPreviewMedia,
  inferResultMediaType,
  resolveMediaUrl,
} from "./promptGalleryUi";

const PAGE_SIZE = 16;

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : fallback;
}

function PromptPreview({ item }: { item: PromptGalleryItem }) {
  const media = getPromptPreviewMedia(item);

  if (!media) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 text-sm leading-7 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
        {item.prompt}
      </div>
    );
  }

  if (media.type === "image") {
    return (
      <img
        src={resolveMediaUrl(media.src)}
        alt={item.title}
        className="max-h-[360px] w-full rounded-2xl border border-slate-200/80 object-cover dark:border-white/10"
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-black dark:border-white/10">
      <video
        src={resolveMediaUrl(media.src)}
        preload="metadata"
        muted
        playsInline
        className="aspect-video w-full object-cover"
      />
    </div>
  );
}

function DetailPreview({ item }: { item: PromptGalleryItem }) {
  const media = getPromptPreviewMedia(item);

  if (!media) {
    return null;
  }

  if (media.type === "image") {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 dark:border-white/10 dark:bg-slate-900/30">
        <img
          src={resolveMediaUrl(media.src)}
          alt={item.title}
          className="w-full object-contain"
        />
      </div>
    );
  }

  return (
    <video
      src={resolveMediaUrl(media.src)}
      controls
      preload="metadata"
      className="aspect-video w-full rounded-xl border border-slate-200/80 bg-black dark:border-white/10"
    />
  );
}

function PromptMediaBlock({
  title,
  items,
  type,
}: {
  title: string;
  items: string[];
  type: "image" | "video" | "audio";
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-[1.4rem] border border-slate-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {type === "image" ? (
          <ImageIcon className="h-4 w-4 text-sky-500" />
        ) : type === "video" ? (
          <Video className="h-4 w-4 text-emerald-500" />
        ) : (
          <AudioLines className="h-4 w-4 text-amber-500" />
        )}
        <span>{title}</span>
      </div>

      {type === "image" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((item, index) => (
            <div
              key={`${type}-${index}`}
              className="overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 dark:border-white/10 dark:bg-slate-900/30"
            >
              <img
                src={resolveMediaUrl(item)}
                alt={`${title} ${index + 1}`}
                className="w-full object-contain"
              />
            </div>
          ))}
        </div>
      ) : type === "video" ? (
        <div className="grid gap-3">
          {items.map((item, index) => (
            <video
              key={`${type}-${index}`}
              src={resolveMediaUrl(item)}
              controls
              preload="metadata"
              className="aspect-video w-full rounded-xl border border-slate-200/80 bg-black dark:border-white/10"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item, index) => (
            <audio
              key={`${type}-${index}`}
              src={resolveMediaUrl(item)}
              controls
              className="w-full"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PromptResultsBlock({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-[1.4rem] border border-slate-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <Sparkles className="h-4 w-4 text-fuchsia-500" />
        <span>{title}</span>
      </div>

      <div className="grid gap-3">
        {items.map((item, index) => {
          const type = inferResultMediaType(item);
          const src = resolveMediaUrl(item);

          return type === "image" ? (
            <div
              key={`result-${index}`}
              className="overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 dark:border-white/10 dark:bg-slate-900/30"
            >
              <img
                src={src}
                alt={`${title} ${index + 1}`}
                className="w-full object-contain"
              />
            </div>
          ) : (
            <video
              key={`result-${index}`}
              src={src}
              controls
              preload="metadata"
              className="aspect-video w-full rounded-xl border border-slate-200/80 bg-black dark:border-white/10"
            />
          );
        })}
      </div>
    </div>
  );
}

function PromptCard({
  item,
  copied,
  labels,
  onOpen,
  onCopy,
}: {
  item: PromptGalleryItem;
  copied: boolean;
  labels: {
    viewDetails: string;
    prompt: string;
    copy: string;
    copied: string;
    noPrompt: string;
    author: string;
    unknownAuthor: string;
  };
  onOpen: (item: PromptGalleryItem) => void;
  onCopy: (event: MouseEvent<HTMLButtonElement>, item: PromptGalleryItem) => void;
}) {
  const authorName = item.author?.name?.trim() || labels.unknownAuthor;
  const authorLink = item.author?.link?.trim() || "";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(item);
        }
      }}
      className="group mb-4 block cursor-pointer break-inside-avoid overflow-hidden rounded-[calc(var(--radius)+0.45rem)] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(245,248,252,0.92)_100%)] shadow-[0_22px_54px_-42px_rgba(15,23,42,0.32)] transition-all duration-200 hover:-translate-y-0.5 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(31,41,55,0.82)_0%,rgba(15,23,42,0.9)_100%)]"
    >
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {item.categories.map((category) => (
            <span
              key={`${item.id}-${category}`}
              className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-200"
            >
              {category}
            </span>
          ))}
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {item.title}
          </h2>
          {item.description ? (
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300 line-clamp-2">
              {item.description}
            </p>
          ) : null}
        </div>

        <PromptPreview item={item} />

        <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-3 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <FileText className="h-4 w-4 text-[hsl(var(--primary))]" />
              <span>{labels.prompt}</span>
            </div>
            <button
              type="button"
              onClick={(event) => onCopy(event, item)}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-100"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? labels.copied : labels.copy}
            </button>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200 line-clamp-2">
            {item.prompt || labels.noPrompt}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-sm text-slate-600 dark:text-slate-300">
            <span className="mr-1">{labels.author}:</span>
            {authorLink ? (
              <a
                href={authorLink}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="truncate text-sky-600 underline underline-offset-4 hover:text-sky-500 dark:text-sky-300"
              >
                {authorName}
              </a>
            ) : (
              <span className="truncate">{authorName}</span>
            )}
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onOpen(item);
            }}
            className="inline-flex h-8 shrink-0 items-center rounded-md bg-[linear-gradient(135deg,#1f2a44_0%,#2e4f84_100%)] px-2.5 text-xs font-semibold text-white"
          >
            {labels.viewDetails}
          </button>
        </div>
      </div>
    </article>
  );
}

function PromptDetailModal({
  item,
  copied,
  labels,
  onClose,
  onCopy,
}: {
  item: PromptGalleryItem;
  copied: boolean;
  labels: {
    prompt: string;
    copy: string;
    copied: string;
    noPrompt: string;
    inputImages: string;
    inputVideos: string;
    inputAudios: string;
    results: string;
    model: string;
    language: string;
    author: string;
    unknownAuthor: string;
  };
  onClose: () => void;
  onCopy: (event: MouseEvent<HTMLButtonElement>, item: PromptGalleryItem) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-2 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-[calc(var(--radius)+0.45rem)] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97)_0%,rgba(245,248,252,0.95)_100%)] shadow-[0_28px_80px_-44px_rgba(15,23,42,0.42)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(31,41,55,0.92)_0%,rgba(15,23,42,0.95)_100%)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-white/10 sm:px-6">
          <h2 className="line-clamp-1 text-base font-semibold text-slate-900 dark:text-white sm:text-lg">
            {item.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(94vh-72px)] space-y-4 overflow-y-auto p-4 sm:p-6">
          <div className="flex flex-wrap gap-2">
            {item.categories.map((category) => (
              <span
                key={`${item.id}-${category}`}
                className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-200"
              >
                {category}
              </span>
            ))}
          </div>

          {item.description ? (
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
              {item.description}
            </p>
          ) : null}

          <div className="grid gap-2 rounded-[1.2rem] border border-slate-200/80 bg-white/75 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 sm:grid-cols-3">
            <div>{labels.model}: {item.model || "-"}</div>
            <div>{labels.language}: {item.language || "-"}</div>
            <div>{labels.author}: {item.author?.name || labels.unknownAuthor}</div>
          </div>

          <DetailPreview item={item} />

          <PromptResultsBlock title={labels.results} items={item.results} />

          <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/75 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <FileText className="h-4 w-4 text-[hsl(var(--primary))]" />
                <span>{labels.prompt}</span>
              </div>
              <button
                type="button"
                onClick={(event) => onCopy(event, item)}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-100"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? labels.copied : labels.copy}
              </button>
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-200">
              {item.prompt || labels.noPrompt}
            </pre>
          </div>

          <PromptMediaBlock title={labels.inputImages} items={item.inputImages} type="image" />
          <PromptMediaBlock title={labels.inputVideos} items={item.inputVideos} type="video" />
          <PromptMediaBlock title={labels.inputAudios} items={item.inputAudios} type="audio" />

          {item.note ? (
            <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
              {item.note}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function PromptsPage({ items }: { items: PromptGalleryItem[] }) {
  const tPromptsPage = useTranslations("Prompts");
  const tPrompts = useTranslations("Prompts.prompts");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const qParam = (searchParams.get("q") || "").trim();
  const categoryParam = searchParams.get("category") || "all";
  const pageParam = parsePositiveInt(searchParams.get("page"), 1);

  const [keywordInput, setKeywordInput] = useState(qParam);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [activeItem, setActiveItem] = useState<PromptGalleryItem | null>(null);

  const categories = useMemo(() => {
    return Array.from(
      new Set(items.flatMap((item) => item.categories).filter(Boolean)),
    ).sort((left, right) => left.localeCompare(right));
  }, [items]);

  const activeCategory =
    categoryParam !== "all" && categories.includes(categoryParam)
      ? categoryParam
      : "all";

  const filteredItems = useMemo(() => {
    const normalizedKeyword = qParam.toLowerCase();

    return items.filter((item) => {
      if (activeCategory !== "all" && !item.categories.includes(activeCategory)) {
        return false;
      }

      if (!normalizedKeyword) {
        return true;
      }

      const haystack = [
        item.title,
        item.description,
        item.prompt,
        item.model,
        item.language,
        item.categories.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedKeyword);
    });
  }, [activeCategory, items, qParam]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(pageParam, 1), totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredItems]);

  const updateUrl = (
    next: {
      q?: string;
      category?: string;
      page?: number;
    },
    replace = false,
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    const nextKeyword = next.q ?? qParam;
    const nextCategory = next.category ?? activeCategory;
    const nextPage = next.page ?? currentPage;

    if (nextKeyword) {
      params.set("q", nextKeyword);
    } else {
      params.delete("q");
    }

    if (nextCategory && nextCategory !== "all") {
      params.set("category", nextCategory);
    } else {
      params.delete("category");
    }

    if (nextPage > 1) {
      params.set("page", String(nextPage));
    } else {
      params.delete("page");
    }

    const query = params.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;
    const currentUrl = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    if (nextUrl === currentUrl) {
      return;
    }

    if (replace) {
      router.replace(nextUrl, { scroll: false });
      return;
    }

    router.push(nextUrl, { scroll: false });
  };

  useEffect(() => {
    setKeywordInput(qParam);
  }, [qParam]);

  useEffect(() => {
    if (activeItem) {
      return;
    }

    if (currentPage !== pageParam || activeCategory !== categoryParam) {
      updateUrl(
        {
          q: qParam,
          category: activeCategory,
          page: currentPage,
        },
        true,
      );
    }
  }, [activeCategory, activeItem, categoryParam, currentPage, pageParam, qParam]);

  useEffect(() => {
    if (!activeItem) {
      return;
    }

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveItem(null);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [activeItem]);

  const applyKeyword = () => {
    updateUrl({ q: keywordInput.trim(), page: 1 });
  };

  const handleCopyPrompt = async (
    event: MouseEvent<HTMLButtonElement>,
    item: PromptGalleryItem,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(item.prompt || "");
      setCopiedId(item.id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === item.id ? null : current));
      }, 1200);
    } catch {
      setCopiedId(null);
    }
  };

  return (
    <div className={`${pageShellClass} min-h-screen`}>
      <section className="relative overflow-hidden px-3 pb-4 pt-14 sm:px-6 sm:pb-6 sm:pt-16 lg:px-8 lg:pb-8 lg:pt-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[10%] top-8 h-40 w-40 rounded-full bg-sky-400/12 blur-3xl" />
          <div className="absolute right-[12%] top-5 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="max-w-4xl">
            <div className={sectionKickerClass}>
              <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
              {tPromptsPage("list.eyebrow")}
            </div>
            <h1
              className={`${displayTitleClass} mt-4 text-[clamp(2rem,9vw,3.8rem)] leading-[1.02] text-slate-950 dark:text-white`}
            >
              {tPromptsPage("list.title")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              {tPromptsPage("list.description")}
            </p>
          </div>
        </div>
      </section>

      <section className="sticky top-20 z-30 border-y border-slate-200/70 bg-[color-mix(in_srgb,hsl(var(--background))_82%,white_18%)]/85 backdrop-blur-2xl dark:border-white/10 dark:bg-[color-mix(in_srgb,hsl(var(--background))_86%,black_14%)]/82">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 sm:px-6 lg:px-8">
          <div
            className="flex flex-wrap items-center gap-2 pb-1 touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
          >
            <button
              type="button"
              onClick={() => updateUrl({ category: "all", page: 1 })}
              className={`inline-flex h-9 shrink-0 items-center rounded-full px-2 text-xs font-semibold transition-all ${
                activeCategory === "all"
                  ? "bg-[linear-gradient(135deg,#1f2a44_0%,#253a64_100%)] text-white"
                  : "border border-slate-200/80 bg-white/80 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
              }`}
            >
              {tPrompts("allCategories")}
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => updateUrl({ category, page: 1 })}
                className={`inline-flex h-9 shrink-0 items-center rounded-full px-2 text-xs font-semibold transition-all ${
                  activeCategory === category
                    ? "bg-[linear-gradient(135deg,#2d6cdf_0%,#39a7d8_100%)] text-white"
                    : "border border-slate-200/80 bg-white/80 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyKeyword();
                  }
                }}
                placeholder={tPrompts("searchPlaceholder")}
                className="h-10 w-full rounded-full border border-slate-200/80 bg-white/80 pl-11 pr-4 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-400 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-100"
              />
            </div>
            <button
              type="button"
              onClick={applyKeyword}
              className="inline-flex h-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1f2a44_0%,#2e4f84_100%)] px-4 text-sm font-semibold text-white"
            >
              {tPrompts("search")}
            </button>
            <div className="inline-flex h-10 items-center rounded-full border border-slate-200/80 bg-white/80 px-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
              {tPrompts("resultCount", { count: filteredItems.length })}
            </div>
          </div>
        </div>
      </section>

      <section className="px-3 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mx-auto w-full max-w-7xl">
          {filteredItems.length === 0 ? (
            <div className="rounded-[calc(var(--radius)+0.7rem)] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center dark:border-white/10 dark:bg-white/[0.03]">
              <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">
                {tPromptsPage("list.empty")}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {tPrompts("emptyDescription")}
              </p>
            </div>
          ) : (
            <>
              <div className="columns-1 [column-gap:1rem] sm:columns-2 sm:[column-gap:1rem] xl:columns-3">
                {pageItems.map((item) => (
                  <PromptCard
                    key={item.id}
                    item={item}
                    copied={copiedId === item.id}
                    labels={{
                      viewDetails: tPromptsPage("list.viewDetails"),
                      prompt: tPromptsPage("detail.prompt"),
                      copy: tPrompts("copy"),
                      copied: tPrompts("copied"),
                      noPrompt: tPrompts("noPrompt"),
                      author: tPrompts("author"),
                      unknownAuthor: tPrompts("unknownAuthor"),
                    }}
                    onOpen={setActiveItem}
                    onCopy={handleCopyPrompt}
                  />
                ))}
              </div>

              {totalPages > 1 ? (
                <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateUrl({ page: Math.max(1, currentPage - 1) })}
                    disabled={currentPage <= 1}
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {tPrompts("prev")}
                  </button>

                  <span className="px-3 text-sm text-slate-600 dark:text-slate-300">
                    {tPromptsPage("list.pageLabel", { page: currentPage, totalPages })}
                  </span>

                  <button
                    type="button"
                    onClick={() => updateUrl({ page: Math.min(totalPages, currentPage + 1) })}
                    disabled={currentPage >= totalPages}
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100"
                  >
                    {tPrompts("next")}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      {activeItem ? (
        <PromptDetailModal
          item={activeItem}
          copied={copiedId === activeItem.id}
          labels={{
            prompt: tPromptsPage("detail.prompt"),
            copy: tPrompts("copy"),
            copied: tPrompts("copied"),
            noPrompt: tPrompts("noPrompt"),
            inputImages: tPromptsPage("detail.referenceImages"),
            inputVideos: tPromptsPage("detail.referenceVideos"),
            inputAudios: tPrompts("inputAudios"),
            results: tPromptsPage("detail.result"),
            model: tPromptsPage("detail.model"),
            language: tPrompts("language"),
            author: tPrompts("author"),
            unknownAuthor: tPrompts("unknownAuthor"),
          }}
          onClose={() => setActiveItem(null)}
          onCopy={handleCopyPrompt}
        />
      ) : null}
    </div>
  );
}
