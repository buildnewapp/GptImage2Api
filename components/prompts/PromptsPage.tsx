"use client";

import {
  AlertCircle,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  FileText,
  ImageIcon,
  Play,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
  cardHeadingClass,
  displayTitleClass,
  heroMeshClass,
  pageShellClass,
  sectionKickerClass,
} from "@/components/home/video/constants";
import { Link } from "@/i18n/routing";

import {
  getNextVisibleCategoryCount,
  getVisiblePromptCategories,
  PROMPTS_CATEGORY_BATCH_SIZE,
  shouldShowLoadMoreCategories,
} from "./pagination";
import { type PromptCategory, promptCategories } from "./promptsData";

const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || "";
const HERO_PREVIEW_CATEGORIES = promptCategories.slice(0, 3);
const TOTAL_PROMPT_COUNT = promptCategories.reduce(
  (sum, category) => sum + category.cases.length,
  0,
);

function MediaThumbnail({
  src,
  type,
  onClick,
  alt,
}: {
  src: string;
  type: "image" | "video";
  onClick?: () => void;
  alt: string;
}) {
  const interactiveClassName = onClick
    ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_18px_42px_-28px_rgba(15,23,42,0.28)]"
    : "";

  return (
    <div
      className={`group relative overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white/80 transition-all duration-300 dark:border-white/10 dark:bg-white/[0.04] ${interactiveClassName}`}
      onClick={onClick}
    >
      {type === "image" ? (
        <Image
          src={`${CDN_URL}${src}`}
          alt={alt}
          width={200}
          height={200}
          className="h-28 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] sm:h-28"
          unoptimized
        />
      ) : (
        <div className="relative flex h-28 w-full items-center justify-center bg-slate-200/80 sm:h-28 dark:bg-slate-700/50">
          <video
            src={`${CDN_URL}${src}`}
            className="h-full w-full object-cover"
            muted
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/20 backdrop-blur-md">
              <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
            </div>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/10 via-transparent to-white/10 opacity-70" />
    </div>
  );
}

function PromptCard({
  promptCase,
  index,
  categoryId,
  onPlayVideo,
  t,
}: {
  promptCase: PromptCategory["cases"][0];
  index: number;
  categoryId: string;
  onPlayVideo: (src: string) => void;
  t: ReturnType<typeof useTranslations<"Prompts">>;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasInputMedia =
    promptCase.images.length > 0 || promptCase.inputVideos.length > 0;
  const promptText = t(`prompts.${categoryId}.${index}` as any);
  const isLong = promptText.length > 120;
  const displayText =
    isLong && !expanded ? `${promptText.slice(0, 120)}...` : promptText;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius)+0.45rem)] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(240,244,248,0.92)_100%)] p-4 shadow-[0_26px_70px_-46px_rgba(15,23,42,0.28)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_80px_-44px_rgba(15,23,42,0.34)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(31,41,55,0.82)_0%,rgba(15,23,42,0.88)_100%)] dark:shadow-[0_28px_82px_-44px_rgba(2,8,23,0.72)] sm:p-6">
      <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_70%)] opacity-80 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
          <FileText className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
          {t("card.prompt")}
        </div>
        {promptCase.duration && (
          <span className="inline-flex min-h-11 items-center rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-[0.72rem] font-semibold text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
            {t("card.duration")}: {promptCase.duration}
          </span>
        )}
      </div>

      <div className="relative mt-5 flex-1">
        <p className="text-[15px] leading-7 text-slate-700 dark:text-slate-200 sm:text-sm">
          {displayText}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-[hsl(var(--primary))] transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 dark:hover:text-white"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                {t("card.collapse")}
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                {t("card.expand")}
              </>
            )}
          </button>
        )}
      </div>

      {hasInputMedia && (
        <div className="relative mt-5 rounded-[1.5rem] border border-slate-200/80 bg-white/65 p-3 dark:border-white/10 dark:bg-white/[0.04] sm:p-4">
          <div className="mb-3 flex flex-wrap items-center gap-4">
            {promptCase.images.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-300">
                <ImageIcon className="h-3.5 w-3.5" />
                <span>
                  {promptCase.images.length}{" "}
                  {promptCase.images.length > 1
                    ? t("card.images")
                    : t("card.image")}
                </span>
              </div>
            )}
            {promptCase.inputVideos.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                <Video className="h-3.5 w-3.5" />
                <span>
                  {promptCase.inputVideos.length}{" "}
                  {promptCase.inputVideos.length > 1
                    ? t("card.videos")
                    : t("card.video")}
                </span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {promptCase.images.map((img, imageIndex) => (
              <MediaThumbnail
                key={`img-${imageIndex}`}
                src={img}
                type="image"
                alt={`Reference image ${imageIndex + 1}`}
              />
            ))}
            {promptCase.inputVideos.map((vid, videoIndex) => (
              <MediaThumbnail
                key={`vid-${videoIndex}`}
                src={vid}
                type="video"
                alt={`Reference video ${videoIndex + 1}`}
                onClick={() => onPlayVideo(`${CDN_URL}${vid}`)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="relative mt-5 rounded-[1.5rem] border border-slate-200/80 bg-slate-950 p-3.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:border-white/10 sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/70">
          <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
          {t("card.generatedResult")}
        </div>
        <div className="grid grid-cols-1 gap-2">
          {promptCase.resultVideos.map((vid, resultIndex) => (
            <button
              key={`result-${resultIndex}`}
              type="button"
              className="group/result relative aspect-video overflow-hidden rounded-[1.25rem] border border-white/10 bg-black text-left transition-all duration-300 hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              onClick={() => onPlayVideo(`${CDN_URL}${vid}`)}
            >
              <video
                src={`${CDN_URL}${vid}`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover/result:scale-[1.02]"
                muted
                preload="metadata"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center opacity-100 transition-all duration-300 group-hover/result:scale-105">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/14 backdrop-blur-md">
                  <Play className="ml-1 h-6 w-6 fill-white text-white" />
                </div>
              </div>
            </button>
          ))}
        </div>
        {promptCase.note && (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-400/15 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-100">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{promptCase.note}</span>
          </div>
        )}
      </div>
    </article>
  );
}

export default function PromptsPage() {
  const t = useTranslations("Prompts");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [visibleCategoryCount, setVisibleCategoryCount] = useState(() =>
    Math.min(PROMPTS_CATEGORY_BATCH_SIZE, promptCategories.length),
  );
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const visibleCategories = useMemo(() => {
    return getVisiblePromptCategories({
      categories: promptCategories,
      activeCategory,
      visibleCategoryCount,
    });
  }, [activeCategory, visibleCategoryCount]);

  const showLoadMoreButton = useMemo(() => {
    return shouldShowLoadMoreCategories({
      activeCategory,
      visibleCategoryCount,
      totalCategoryCount: promptCategories.length,
    });
  }, [activeCategory, visibleCategoryCount]);

  const handlePlayVideo = useCallback((src: string) => {
    setSelectedVideo(src);
  }, []);

  const handleLoadMoreCategories = useCallback(() => {
    setVisibleCategoryCount((currentVisibleCategoryCount) =>
      getNextVisibleCategoryCount({
        currentVisibleCategoryCount,
        totalCategoryCount: promptCategories.length,
      }),
    );
  }, []);

  const getCategoryTitle = (id: string) => {
    return t(`categories.${id}.title` as any);
  };

  const getCategoryDescription = (id: string) => {
    return t(`categories.${id}.description` as any);
  };

  return (
    <div className={`${pageShellClass} min-h-screen`}>
      <section className="relative overflow-hidden px-3 pb-8 pt-20 sm:px-6 sm:pb-10 sm:pt-24 lg:px-8 lg:pb-14 lg:pt-32">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-[8%] top-10 h-48 w-48 rounded-full bg-sky-400/15 blur-3xl" />
          <div className="absolute bottom-0 right-[10%] h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-end">
            <div className="max-w-4xl">
              <div className={sectionKickerClass}>
                <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                {t("hero.badge")}
              </div>
              <h1
                className={`${displayTitleClass} mt-5 max-w-4xl text-[clamp(2.5rem,14vw,6.2rem)] leading-[0.96] text-slate-950 dark:text-white sm:mt-6 sm:leading-[0.99]`}
              >
                {t("hero.title")}
                <span className="mt-2 block bg-gradient-to-r from-[hsl(var(--primary))] via-sky-500 to-[hsl(var(--accent))] bg-clip-text text-transparent">
                  {t("hero.titleHighlight")}
                </span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:mt-6 sm:leading-8 sm:text-lg">
                {t("hero.description")}
              </p>
            </div>

            <div
              className={`${heroMeshClass} rounded-[calc(var(--radius)+0.8rem)] border border-white/10 p-4 text-white shadow-[0_30px_90px_-48px_rgba(15,23,42,0.72)] sm:p-6`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/58">
                    {t("hero.badge")}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {activeCategory === "all"
                      ? t("nav.all")
                      : getCategoryTitle(activeCategory)}
                  </p>
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                  {TOTAL_PROMPT_COUNT}
                </div>
              </div>

              <div className="space-y-2.5 sm:space-y-3">
                {HERO_PREVIEW_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(category.id)}
                    className="flex min-h-11 w-full items-start justify-between gap-3 rounded-[1.25rem] border border-white/10 bg-white/8 px-4 py-3.5 text-left transition-all duration-300 hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:gap-4 sm:rounded-[1.4rem] sm:py-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {getCategoryTitle(category.id)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/66">
                        {getCategoryDescription(category.id)}
                      </p>
                    </div>
                    <ArrowUpRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-white/72" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-20 z-30 border-y border-slate-200/70 bg-[color-mix(in_srgb,hsl(var(--background))_78%,white_22%)]/80 backdrop-blur-2xl dark:border-white/10 dark:bg-[color-mix(in_srgb,hsl(var(--background))_82%,black_18%)]/78">
        <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="-mx-3 overflow-x-auto px-3 py-3 sm:mx-0 sm:px-0 sm:py-4">
            <div className="flex min-w-max gap-2">
            <button
              onClick={() => setActiveCategory("all")}
              className={`min-h-11 flex-none rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 ${
                activeCategory === "all"
                  ? "bg-[linear-gradient(135deg,#1f2a44_0%,#253a64_100%)] text-white shadow-[0_18px_32px_-24px_rgba(15,23,42,0.52)]"
                  : "border border-slate-200/80 bg-white/80 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08]"
              }`}
            >
              {t("nav.all")}
            </button>
            {promptCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`min-h-11 flex-none rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 ${
                  activeCategory === category.id
                    ? "bg-[linear-gradient(135deg,#2d6cdf_0%,#39a7d8_100%)] text-white shadow-[0_18px_32px_-24px_rgba(59,130,246,0.52)]"
                    : "border border-slate-200/80 bg-white/80 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08]"
                }`}
              >
                {getCategoryTitle(category.id)}
              </button>
            ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-3 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <div className="mx-auto w-full max-w-7xl">
          {visibleCategories.map((category, categoryIndex) => (
            <div
              key={category.id}
              className="mb-6 rounded-[calc(var(--radius)+0.8rem)] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(244,247,250,0.84)_100%)] p-3.5 shadow-[0_30px_90px_-56px_rgba(15,23,42,0.25)] backdrop-blur-md dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.6)_0%,rgba(15,23,42,0.78)_100%)] dark:shadow-[0_30px_90px_-56px_rgba(2,8,23,0.75)] sm:mb-8 sm:p-6 lg:mb-10 lg:p-8"
            >
              <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-3 py-1.5 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                    <span className="text-[hsl(var(--primary))]">
                      {String(categoryIndex + 1).padStart(2, "0")}
                    </span>
                    {getCategoryTitle(category.id)}
                  </div>
                  <h2
                    className={`${cardHeadingClass} text-[clamp(2rem,3vw,3rem)] text-slate-950 dark:text-white`}
                  >
                    {getCategoryTitle(category.id)}
                  </h2>
                  <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                    {getCategoryDescription(category.id)}
                  </p>
                </div>

                <div className="w-fit rounded-[1.5rem] border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-medium text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                  {String(category.cases.length).padStart(2, "0")}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {category.cases.map((promptCase, index) => (
                  <PromptCard
                    key={index}
                    promptCase={promptCase}
                    index={index}
                    categoryId={category.id}
                    onPlayVideo={handlePlayVideo}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ))}

          {showLoadMoreButton && (
            <div className="mt-10 flex justify-center">
              <button
                onClick={handleLoadMoreCategories}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1f2a44_0%,#253a64_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_34px_-22px_rgba(15,23,42,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2"
              >
                {t("pagination.loadMore")}
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="px-3 pb-14 sm:px-6 lg:px-8 lg:pb-20">
        <div className="mx-auto w-full max-w-7xl">
          <div
            className={`${heroMeshClass} overflow-hidden rounded-[calc(var(--radius)+1rem)] border border-white/10 px-5 py-10 text-center text-white shadow-[0_34px_90px_-54px_rgba(15,23,42,0.72)] sm:px-8 lg:px-12 lg:py-14`}
          >
            <div className="mx-auto max-w-3xl">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-white/70">
                <Sparkles className="h-3.5 w-3.5" />
                {t("hero.badge")}
              </div>
              <h2
                className={`${cardHeadingClass} mt-6 text-[clamp(2.2rem,4vw,3.8rem)] text-white`}
              >
                {t("cta.title")}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
                {t("cta.description")}
              </p>
              <Link
                href="/"
                className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-semibold text-slate-900 shadow-[0_22px_42px_-24px_rgba(255,255,255,0.48)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                <Sparkles className="h-5 w-5" />
                {t("cta.button")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {selectedVideo &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/88 p-4 backdrop-blur-md animate-in fade-in duration-200">
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Close video dialog"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-black shadow-2xl">
              <video
                src={selectedVideo}
                className="h-full w-full object-contain"
                controls
                autoPlay
                playsInline
              />
            </div>

            <div
              className="absolute inset-0 -z-10"
              onClick={() => setSelectedVideo(null)}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
