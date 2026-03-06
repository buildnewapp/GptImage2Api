"use client";

import {
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

import { type PromptCategory, promptCategories } from "./promptsData";

const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || "";

function MediaThumbnail({
  src,
  type,
  onClick,
  alt,
}: {
  src: string;
  type: "image" | "video";
  onClick: () => void;
  alt: string;
}) {
  return (
    <div
      className="relative group cursor-pointer rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600/50 hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
      onClick={onClick}
    >
      {type === "image" ? (
        <Image
          src={`${CDN_URL}${src}`}
          alt={alt}
          width={200}
          height={200}
          className="w-full h-24 sm:h-28 object-cover transition-transform duration-500 group-hover:scale-110"
          unoptimized
        />
      ) : (
        <div className="relative w-full h-24 sm:h-28 bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
          <video
            src={`${CDN_URL}${src}`}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
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
    isLong && !expanded ? promptText.slice(0, 120) + "..." : promptText;

  return (
    <div className="group relative bg-white dark:bg-slate-800/80 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 overflow-hidden backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
      {/* Gradient accent top bar */}
      <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 opacity-60 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="p-5 sm:p-6">
        {/* Prompt text */}
        <div className="mb-4">
          <div className="flex items-start gap-2 mb-2">
            <FileText className="w-4 h-4 text-purple-500 mt-1 flex-shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-500 dark:text-purple-400">
              {t("card.prompt")}
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
            {displayText}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3" /> {t("card.collapse")}
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" /> {t("card.expand")}
                </>
              )}
            </button>
          )}
          {promptCase.duration && (
            <span className="inline-block mt-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded-full font-medium">
              {t("card.duration")}: {promptCase.duration}
            </span>
          )}
        </div>

        {/* Input media */}
        {hasInputMedia && (
          <div className="mb-4">
            <div className="flex items-center gap-4 mb-2">
              {promptCase.images.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs font-medium text-blue-500 dark:text-blue-400">
                    {promptCase.images.length}{" "}
                    {promptCase.images.length > 1
                      ? t("card.images")
                      : t("card.image")}
                  </span>
                </div>
              )}
              {promptCase.inputVideos.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-500 dark:text-emerald-400">
                    {promptCase.inputVideos.length}{" "}
                    {promptCase.inputVideos.length > 1
                      ? t("card.videos")
                      : t("card.video")}
                  </span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {promptCase.images.map((img, i) => (
                <MediaThumbnail
                  key={`img-${i}`}
                  src={img}
                  type="image"
                  alt={`Reference image ${i + 1}`}
                  onClick={() => { }}
                />
              ))}
              {promptCase.inputVideos.map((vid, i) => (
                <MediaThumbnail
                  key={`vid-${i}`}
                  src={vid}
                  type="video"
                  alt={`Reference video ${i + 1}`}
                  onClick={() => onPlayVideo(`${CDN_URL}${vid}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Output */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-fuchsia-500 dark:text-fuchsia-400">
              {t("card.generatedResult")}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {promptCase.resultVideos.map((vid, i) => (
              <div
                key={`result-${i}`}
                className="relative group/result cursor-pointer rounded-xl overflow-hidden bg-black aspect-video border border-slate-200 dark:border-slate-600/50 hover:border-fuchsia-400 dark:hover:border-fuchsia-500 transition-all duration-300 hover:shadow-xl hover:shadow-fuchsia-500/10"
                onClick={() => onPlayVideo(`${CDN_URL}${vid}`)}
              >
                <video
                  src={`${CDN_URL}${vid}`}
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/result:opacity-100 transition-all duration-300 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center transform scale-75 group-hover/result:scale-100 transition-all duration-300">
                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {promptCase.note && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              ⚠️ {t("card.note")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PromptsPage() {
  const t = useTranslations("Prompts");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    if (activeCategory === "all") return promptCategories;
    return promptCategories.filter((cat) => cat.id === activeCategory);
  }, [activeCategory]);

  const handlePlayVideo = useCallback((src: string) => {
    setSelectedVideo(src);
  }, []);

  const getCategoryTitle = (id: string) => {
    return t(`categories.${id}.title` as any);
  };

  const getCategoryDescription = (id: string) => {
    return t(`categories.${id}.description` as any);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-300">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-400/10 dark:bg-purple-900/10 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-fuchsia-400/10 dark:bg-fuchsia-900/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1.5s" }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/5 dark:bg-blue-900/5 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "3s" }}
          />
        </div>

        <div className="container px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 border py-2 px-5 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-purple-200 dark:border-purple-800 mb-6">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {t("hero.badge")}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
              <span className="text-gray-900 dark:text-white">
                {t("hero.title")}{" "}
              </span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600">
                {t("hero.titleHighlight")}
              </span>
            </h1>
            <p className="text-lg lg:text-xl text-gray-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
              {t("hero.description")}
            </p>
          </div>
        </div>
      </section>

      {/* Category Navigation */}
      <section className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/50">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 py-4">
            <button
              onClick={() => setActiveCategory("all")}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeCategory === "all"
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20"
                : "bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
            >
              {t("nav.all")}
            </button>
            {promptCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeCategory === cat.id
                  ? `bg-gradient-to-r ${cat.gradient} text-white shadow-lg`
                  : "bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
              >
                {getCategoryTitle(cat.id)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Prompts Grid */}
      <section className="py-12 lg:py-16">
        <div className="container px-4 sm:px-6 lg:px-8">
          {filteredCategories.map((category) => (
            <div key={category.id} className="mb-16 last:mb-0">
              {/* Category Header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-1.5 h-8 rounded-full bg-gradient-to-b ${category.gradient}`}
                  />
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                    {getCategoryTitle(category.id)}
                  </h2>
                </div>
                <p className="text-gray-500 dark:text-slate-400 ml-[22px] text-sm">
                  {getCategoryDescription(category.id)}
                </p>
              </div>

              {/* Cases Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 to-fuchsia-600/5 dark:from-violet-600/10 dark:to-fuchsia-600/10" />
        <div className="container px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t("cta.title")}
          </h2>
          <p className="text-gray-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
            {t("cta.description")}
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-full hover:shadow-xl hover:shadow-violet-500/20 transition-all duration-300 hover:scale-105"
          >
            <Sparkles className="w-5 h-5" />
            {t("cta.button")}
          </a>
        </div>
      </section>

      {/* Video Modal */}
      {selectedVideo &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors z-10"
            >
              <X className="w-8 h-8" />
            </button>

            <div className="relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
              <video
                src={selectedVideo}
                className="w-full h-full object-contain"
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
          document.body
        )}
    </div>
  );
}
