import { PromptCase } from "@/components/prompts/promptsData";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  ImageIcon,
  Play,
  Sparkles,
  Video,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

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
          className="w-full h-20 sm:h-24 object-cover transition-transform duration-500 group-hover:scale-110"
          unoptimized
        />
      ) : (
        <div className="relative w-full h-20 sm:h-24 bg-slate-200 dark:bg-slate-600 flex items-center justify-center">
          <video
            src={`${CDN_URL}${src}`}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-3 h-3 text-white fill-white ml-0.5" />
            </div>
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
    </div>
  );
}

export default function HeroPromptCard({
  promptCase,
  index,
  categoryId,
  onPlayVideo,
  t,
}: {
  promptCase: PromptCase;
  index: number;
  categoryId: string;
  onPlayVideo: (src: string) => void;
  t: ReturnType<typeof useTranslations<"Prompts">>;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasInputMedia =
    promptCase.images.length > 0 || promptCase.inputVideos.length > 0;

  // Try to get translation, fallback to promptCase.prompt if fails or key missing
  let promptText = "";
  try {
    promptText = t(`prompts.${categoryId}.${index}` as any);
  } catch (e) {
    promptText = promptCase.prompt;
  }
  // Fallback if translation returns the key itself (common behavior in some i18n libs if missing)
  if (promptText === `prompts.${categoryId}.${index}`) {
    promptText = promptCase.prompt;
  }

  const isLong = promptText.length > 120;
  const displayText =
    isLong && !expanded ? promptText.slice(0, 120) + "..." : promptText;

  return (
    <div className="h-full w-full min-w-0 max-w-full flex flex-col group relative bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
      {/* Gradient accent top bar */}
      <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 opacity-60 group-hover:opacity-100 transition-opacity duration-300 flex-shrink-0" />

      <div className="flex-1 min-w-0 p-5 sm:p-6 overflow-y-auto custom-scrollbar">
        {/* Prompt text */}
        <div className="mb-4">
          <div className="flex items-start gap-2 mb-2">
            <FileText className="w-4 h-4 text-purple-500 mt-1 flex-shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-500 dark:text-purple-400">
              {t("card.prompt")}
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed break-words [overflow-wrap:anywhere]">
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
            <div className="flex max-w-full gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {promptCase.images.map((img, i) => (
                <div key={`img-${i}`} className="flex-shrink-0 w-24 sm:w-28">
                  <MediaThumbnail
                    src={img}
                    type="image"
                    alt={`Reference image ${i + 1}`}
                    onClick={() => { }}
                  />
                </div>
              ))}
              {promptCase.inputVideos.map((vid, i) => (
                <div key={`vid-${i}`} className="flex-shrink-0 w-24 sm:w-28">
                  <MediaThumbnail
                    src={vid}
                    type="video"
                    alt={`Reference video ${i + 1}`}
                    onClick={() => onPlayVideo(`${CDN_URL}${vid}`)}
                  />
                </div>
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
