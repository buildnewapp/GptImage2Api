"use client";

import AIVideoMiniStudioTaskHistory from "@/components/ai/AIVideoMiniStudioTaskHistory";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AiVideoStudioFamilyIcon } from "@/components/ai/AiVideoStudioFamilyIcon";
import { authClient } from "@/lib/auth/auth-client";
import {
  AI_VIDEO_STUDIO_FAMILIES,
  getAiVideoStudioLevelLimit,
  getAiVideoStudioSelectionFromModelId,
  getAiVideoStudioVersions,
  resolveAiVideoStudioModelId,
  type AiVideoStudioFamilyKey,
  type AiVideoStudioFamilyIconKey,
  type AiVideoStudioLevelLimit,
  type AiVideoStudioVersionKey,
} from "@/config/ai-video-studio";
import {
  AI_VIDEO_STUDIO_FORM_STORAGE_KEY,
  buildAiVideoStudioPayload,
  safeParseAiVideoStudioStoredState,
  serializeAiVideoStudioStoredState,
  type AiVideoStudioFormValues,
} from "@/lib/ai-video-studio/adapter";
import { uploadReferenceFile } from "@/lib/ai-video-studio/reference-upload";
import {
  coerceAiVideoMiniStudioFieldValue,
  getAiVideoMiniStudioFieldOptions,
  estimateAiVideoMiniStudioCredits,
  getAiVideoMiniStudioPrimaryFields,
  validateAiVideoMiniStudioSubmission,
} from "@/lib/ai-video-studio/mini";
import {
  createAiVideoMiniStudioGenerationTask,
  resolveAiVideoMiniStudioTaskState,
  type AiVideoMiniStudioGenerationTask,
} from "@/lib/ai-video-studio/mini-history";
import {
  mergeAiVideoStudioFormValues,
  normalizeAiVideoStudioSchema,
} from "@/lib/ai-video-studio/schema";
import type {
  AiStudioPublicDocDetail,
} from "@/lib/ai-studio/public";
import type { AiStudioResolvedPricing } from "@/lib/ai-studio/runtime";
import { fetchWithTimeout } from "@/lib/fetch/with-timeout";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/routing";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ImagePlus,
  Loader2,
  Search,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

type DetailResponse = {
  success: boolean;
  data: AiStudioPublicDocDetail;
  error?: string;
};

type FamiliesResponse = {
  success: boolean;
  data: {
    families: Array<{
      key: string;
      versions: Array<{
        key: string;
        priceLabel?: string | null;
      }>;
    }>;
  };
  error?: string;
};

type ExecuteResponse = {
  success: boolean;
  data: {
    reservedCredits?: number;
    state?: string;
    taskId?: string | null;
    selectedPricing?: AiStudioResolvedPricing | null;
  };
  error?: string;
};

type TaskResponse = {
  success: boolean;
  data: {
    state: string;
    mediaUrls: string[];
    raw?: unknown;
    reason?: string | null;
  };
  error?: string;
};

const FAST_TASK_POLLING_MS = 5000;
const SLOW_TASK_POLLING_MS = 10000;
const HIDDEN_TASK_POLLING_MS = 20000;
const SLOW_TASK_POLLING_AFTER_MS = 30000;

function getTaskPollingDelay(startedAt: number) {
  const isHidden =
    typeof document !== "undefined" && document.visibilityState === "hidden";
  const baseDelay = isHidden
    ? HIDDEN_TASK_POLLING_MS
    : Date.now() - startedAt > SLOW_TASK_POLLING_AFTER_MS
      ? SLOW_TASK_POLLING_MS
      : FAST_TASK_POLLING_MS;

  return baseDelay + Math.floor(Math.random() * 1000);
}

function getFirstSelectableFamily() {
  return (
    AI_VIDEO_STUDIO_FAMILIES.find((family) => family.selectable !== false) ??
    AI_VIDEO_STUDIO_FAMILIES[0]
  );
}

function getDefaultSelection(initialModelId?: string | null) {
  const resolvedSelection =
    typeof initialModelId === "string" && initialModelId.length > 0
      ? getAiVideoStudioSelectionFromModelId(initialModelId)
      : null;
  if (resolvedSelection) {
    return resolvedSelection;
  }

  const family = getFirstSelectableFamily();
  const version = family ? getAiVideoStudioVersions(family.key)[0] : null;

  return {
    familyKey: family?.key ?? "sora2",
    versionKey: version?.key ?? "sora-2",
  };
}

function getImageValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.find((item): item is string => typeof item === "string") ?? null;
  }

  return typeof value === "string" && value.length > 0 ? value : null;
}

function extractFailureReason(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const data =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : null;

  const candidates = [
    data?.failMsg,
    data?.errorMessage,
    data?.message,
    record.reason,
    record.error,
    record.message,
  ];

  const match = candidates.find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );

  return match?.trim() ?? null;
}

function formatDurationOptionLabel(fieldKey: string, value: string | number) {
  if (fieldKey === "n_frames" || fieldKey === "duration") {
    return `${value}s`;
  }

  return value;
}

type MiniModelSelectorItem = {
  id: AiVideoStudioFamilyKey;
  name: string;
  description: string;
  icon: AiVideoStudioFamilyIconKey;
  tags?: { text: string; type: string }[];
  selectable?: boolean;
};

type MiniVersionSelectorItem = {
  id: AiVideoStudioVersionKey;
  name: string;
  description?: string | null;
  isSpecial?: boolean;
  isHot?: boolean;
  priceLabel?: string | null;
  levelLimit: AiVideoStudioLevelLimit;
};

function MiniModelVersionSelector({
  models,
  versionsByFamily,
  selectedFamilyKey,
  selectedVersionKey,
  onSelect,
  searchPlaceholder,
  allModelsLabel,
}: {
  models: MiniModelSelectorItem[];
  versionsByFamily: Record<string, MiniVersionSelectorItem[]>;
  selectedFamilyKey: AiVideoStudioFamilyKey;
  selectedVersionKey: AiVideoStudioVersionKey;
  onSelect: (selection: {
    familyKey: AiVideoStudioFamilyKey;
    versionKey: AiVideoStudioVersionKey;
  }) => void;
  searchPlaceholder: string;
  allModelsLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileView, setMobileView] = useState<"models" | "versions">("models");
  const [activeFamilyKey, setActiveFamilyKey] =
    useState<AiVideoStudioFamilyKey>(selectedFamilyKey);
  const [activeFeaturedFamilyKey, setActiveFeaturedFamilyKey] =
    useState<AiVideoStudioFamilyKey | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveFamilyKey(selectedFamilyKey);
      setActiveFeaturedFamilyKey(null);
      setMobileView("models");
    }
  }, [isOpen, selectedFamilyKey]);

  const selectedModel =
    models.find((model) => model.id === selectedFamilyKey) ?? models[0] ?? null;
  const selectedVersion =
    versionsByFamily[selectedFamilyKey]?.find(
      (version) => version.id === selectedVersionKey,
    ) ??
    versionsByFamily[selectedFamilyKey]?.[0] ??
    null;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredModels = normalizedSearch
    ? models.filter(
        (model) =>
          model.name.toLowerCase().includes(normalizedSearch) ||
          model.description.toLowerCase().includes(normalizedSearch),
      )
    : models;
  const featuredModels = normalizedSearch
    ? []
    : models.filter((model) =>
        (versionsByFamily[model.id] ?? []).some(
          (version) => version.isHot === true,
        ),
      );
  const activeFamilyVersions =
    versionsByFamily[activeFamilyKey] ??
    versionsByFamily[selectedFamilyKey] ??
    [];
  const activeVersions =
    activeFeaturedFamilyKey === activeFamilyKey
      ? activeFamilyVersions.filter((version) => version.isHot === true)
      : activeFamilyVersions;
  const activeModel =
    models.find((model) => model.id === activeFamilyKey) ?? selectedModel;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={allModelsLabel}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
        className="h-9 w-[120px] rounded-full border border-white/12 bg-white/6 px-2 py-2 text-[12px] font-medium text-white/80 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] transition hover:border-white/20 hover:bg-white/10"
      >
        <span className="block truncate">
          {selectedVersion?.name ?? selectedModel?.name ?? allModelsLabel}
        </span>
      </button>

      {isOpen ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 flex h-[60dvh] flex-col overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#15191c]/95 text-white shadow-2xl backdrop-blur-xl sm:absolute sm:inset-x-auto sm:bottom-full sm:left-0 sm:mb-2 sm:max-h-none sm:w-[min(calc(100vw-2rem),680px)] sm:max-w-[calc(100vw-2rem)]">
            <div className="flex h-[60dvh] flex-col sm:hidden">
              {mobileView === "models" ? (
                <div className="flex h-16 items-center gap-3 border-b border-white/8 px-4">
                  <Search className="h-5 w-5 shrink-0 text-white/45" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-14 min-w-0 flex-1 bg-transparent py-0 text-base leading-none text-white outline-none placeholder:text-white/45"
                  />
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/50 transition hover:bg-white/8 hover:text-white"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="flex h-14 items-center gap-3 border-b border-white/8 px-3">
                  <button
                    type="button"
                    onClick={() => setMobileView("models")}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/8 hover:text-white"
                    aria-label="Back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">
                      {activeModel?.name ?? allModelsLabel}
                    </div>
                    <div className="truncate text-xs text-white/45">
                      {activeFeaturedFamilyKey === activeFamilyKey
                        ? "Featured versions"
                        : "Versions"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/50 transition hover:bg-white/8 hover:text-white"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3 [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
                {mobileView === "models" ? (
                  <>
                    {featuredModels.length > 0 ? (
                      <div className="pb-3">
                        <div className="mb-2 flex items-center gap-2 px-2 text-sm font-medium text-white/45">
                          <Sparkles className="h-4 w-4" />
                          Featured models
                        </div>
                        <div className="space-y-1">
                          {featuredModels.map((model) => {
                            const isSelected = model.id === selectedFamilyKey;

                            return (
                              <button
                                key={`mobile-featured-${model.id}`}
                                type="button"
                                onClick={() => {
                                  setActiveFamilyKey(model.id);
                                  setActiveFeaturedFamilyKey(model.id);
                                  setMobileView("versions");
                                }}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition",
                                  isSelected ? "bg-white/8" : "hover:bg-white/6",
                                )}
                              >
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/8">
                                  <AiVideoStudioFamilyIcon icon={model.icon} size={26} />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span className="truncate text-base font-semibold text-white">
                                      {model.name}
                                    </span>
                                    {model.tags?.map((tag) => (
                                      <MiniSelectorBadge
                                        key={`mobile-featured-${model.id}-${tag.text}`}
                                        type={tag.type}
                                        text={tag.text}
                                      />
                                    ))}
                                  </span>
                                  <span className="mt-1 line-clamp-1 text-sm leading-snug text-white/45">
                                    {model.description}
                                  </span>
                                </span>
                                <ChevronRight className="h-5 w-5 shrink-0 text-white/45" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-center gap-2 px-2 py-3 text-sm text-white/45">
                      <span className="h-2 w-2 rounded-full bg-white/45" />
                      {allModelsLabel}
                    </div>
                    {filteredModels.map((model) => {
                      const isSelected = model.id === selectedFamilyKey;

                      return (
                        <button
                          key={`mobile-${model.id}`}
                          type="button"
                          onClick={() => {
                            setActiveFamilyKey(model.id);
                            setActiveFeaturedFamilyKey(null);
                            setMobileView("versions");
                          }}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition",
                            isSelected ? "bg-white/8" : "hover:bg-white/6",
                          )}
                        >
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/8">
                            <AiVideoStudioFamilyIcon icon={model.icon} size={28} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="truncate text-base font-semibold text-white">
                                {model.name}
                              </span>
                              {model.tags?.map((tag) => (
                                <MiniSelectorBadge
                                  key={`mobile-${model.id}-${tag.text}`}
                                  type={tag.type}
                                  text={tag.text}
                                />
                              ))}
                            </span>
                            <span className="mt-1 line-clamp-2 text-sm leading-snug text-white/45">
                              {model.description}
                            </span>
                          </span>
                          <ChevronRight className="h-5 w-5 shrink-0 text-white/45" />
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <div className="space-y-1">
                    {activeVersions.map((version) => {
                      const isSelected =
                        activeFamilyKey === selectedFamilyKey &&
                        version.id === selectedVersionKey;

                      return (
                        <button
                          key={`mobile-version-${version.id}`}
                          type="button"
                          onClick={() => {
                            onSelect({
                              familyKey: activeFamilyKey,
                              versionKey: version.id,
                            });
                            setIsOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition",
                            isSelected ? "bg-white/8" : "hover:bg-white/6",
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="truncate text-base font-semibold text-white">
                                {version.name}
                              </span>
                              <MiniVersionBadges version={version} />
                            </span>
                            {version.description ? (
                              <span className="mt-1 line-clamp-2 text-sm leading-snug text-white/45">
                                {version.description}
                              </span>
                            ) : null}
                            {version.priceLabel ? (
                              <span className="mt-1 line-clamp-2 text-sm leading-snug text-white/45">
                                {version.priceLabel}
                              </span>
                            ) : null}
                          </span>
                          {isSelected ? (
                            <Check className="mt-1 h-4 w-4 shrink-0 text-white/70" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="hidden sm:flex">
            <div className="flex max-h-[360px] w-full flex-col border-b border-white/8 sm:max-h-[480px] sm:w-[340px] sm:border-b-0 sm:border-r">
              <div className="flex h-16 items-center gap-3 border-b border-white/8 px-4">
                <Search className="h-5 w-5 shrink-0 text-white/45" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-14 min-w-0 flex-1 bg-transparent py-0 text-base leading-none text-white outline-none placeholder:text-white/45"
                />
              </div>
              <div className="overflow-y-auto px-3 pb-3 [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/30">
                {featuredModels.length > 0 ? (
                  <div className="px-2 py-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white/45">
                      <Sparkles className="h-4 w-4" />
                      Featured models
                    </div>
                    <div className="space-y-1">
                      {featuredModels.map((model) => {
                        const isActive =
                          model.id === activeFamilyKey &&
                          activeFeaturedFamilyKey === model.id;
                        const isSelected = model.id === selectedFamilyKey;

                        return (
                          <button
                            key={`featured-${model.id}`}
                            type="button"
                            onClick={() => {
                              setActiveFamilyKey(model.id);
                              setActiveFeaturedFamilyKey(model.id);
                            }}
                            onMouseEnter={() => {
                              setActiveFamilyKey(model.id);
                              setActiveFeaturedFamilyKey(model.id);
                            }}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition",
                              isActive || isSelected
                                ? "bg-white/8"
                                : "hover:bg-white/6",
                            )}
                          >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/8">
                              <AiVideoStudioFamilyIcon icon={model.icon} size={26} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex min-w-0 items-center gap-2">
                                <span className="truncate text-base font-semibold text-white">
                                  {model.name}
                                </span>
                                {model.tags?.map((tag) => (
                                  <MiniSelectorBadge
                                    key={`featured-${model.id}-${tag.text}`}
                                    type={tag.type}
                                    text={tag.text}
                                  />
                                ))}
                              </span>
                              <span className="mt-1 line-clamp-1 text-sm leading-snug text-white/45">
                                {model.description}
                              </span>
                            </span>
                            {isSelected ? (
                              <Check className="h-4 w-4 shrink-0 text-[#b6ff00]" />
                            ) : (
                              <ChevronRight className="h-5 w-5 shrink-0 text-white/45" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center gap-2 px-2 py-3 text-sm text-white/45">
                  <span className="h-2 w-2 rounded-full bg-white/45" />
                  {allModelsLabel}
                </div>
                {filteredModels.map((model) => {
                  const isActive = model.id === activeFamilyKey;
                  const isSelected = model.id === selectedFamilyKey;

                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        setActiveFamilyKey(model.id);
                        setActiveFeaturedFamilyKey(null);
                      }}
                      onMouseEnter={() => {
                        setActiveFamilyKey(model.id);
                        setActiveFeaturedFamilyKey(null);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition",
                        isActive || isSelected
                          ? "bg-white/8"
                          : "hover:bg-white/6",
                      )}
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/8">
                        <AiVideoStudioFamilyIcon icon={model.icon} size={28} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-base font-semibold text-white">
                            {model.name}
                          </span>
                          {model.tags?.map((tag) => (
                            <MiniSelectorBadge
                              key={`${model.id}-${tag.text}`}
                              type={tag.type}
                              text={tag.text}
                            />
                          ))}
                        </span>
                        <span className="mt-1 line-clamp-2 text-sm leading-snug text-white/45">
                          {model.description}
                        </span>
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-white/45" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="max-h-[320px] w-full overflow-y-auto p-3 [scrollbar-color:rgba(255,255,255,0.18)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/30 sm:max-h-[480px] sm:w-[320px]">
              {activeVersions.map((version) => {
                const isSelected =
                  activeFamilyKey === selectedFamilyKey &&
                  version.id === selectedVersionKey;

                return (
                  <button
                    key={version.id}
                    type="button"
                    onClick={() => {
                      onSelect({
                        familyKey: activeFamilyKey,
                        versionKey: version.id,
                      });
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition",
                      isSelected ? "bg-white/8" : "hover:bg-white/6",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-base font-semibold text-white">
                          {version.name}
                        </span>
                        <MiniVersionBadges version={version} />
                      </span>
                      {version.description ? (
                        <span className="mt-1 line-clamp-2 text-sm leading-snug text-white/45">
                          {version.description}
                        </span>
                      ) : null}
                      {version.priceLabel ? (
                        <span className="mt-1 line-clamp-2 text-sm leading-snug text-white/45">
                          {version.priceLabel}
                        </span>
                      ) : null}
                    </span>
                    {isSelected ? (
                      <Check className="mt-1 h-4 w-4 shrink-0 text-white/70" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function MiniVersionBadges({
  version,
}: {
  version: MiniVersionSelectorItem;
}) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {version.isSpecial ? <MiniSelectorBadge type="special" text="SALE" /> : null}
      {version.isHot ? <MiniSelectorBadge type="hot" text="HOT" /> : null}
      {version.levelLimit !== "none" ? (
        <MiniSelectorBadge type="level" text={version.levelLimit.toUpperCase()} />
      ) : null}
    </span>
  );
}

function MiniSelectorBadge({
  text,
  type,
}: {
  text: string;
  type: string;
}) {
  const styles: Record<string, string> = {
    hot: "bg-sky-400 text-black",
    level: "bg-[#b6ff00] text-black",
    special: "bg-[#b6ff00] text-black",
  };

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-black italic leading-none",
        styles[type] ?? "bg-white/15 text-white/70",
      )}
    >
      {text}
    </span>
  );
}

interface AIVideoMiniStudioProps {
  initialModelId?: string | null;
}

const LoginDialog = lazy(() => import("@/components/auth/LoginDialog"));

export default function AIVideoMiniStudio({
  initialModelId = null,
}: AIVideoMiniStudioProps) {
  const t = useTranslations("AIVideoStudio");
  const router = useRouter();
  const defaultSelection = useMemo(
    () => getDefaultSelection(initialModelId),
    [initialModelId],
  );
  const { data: session } = authClient.useSession();
  const hasInitializedFromStorageRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pollingInFlightRef = useRef<Set<string>>(new Set());

  const [selectedFamilyKey, setSelectedFamilyKey] = useState<AiVideoStudioFamilyKey>(
    defaultSelection.familyKey,
  );
  const [selectedVersionKey, setSelectedVersionKey] = useState<AiVideoStudioVersionKey>(
    defaultSelection.versionKey,
  );
  const [formValues, setFormValues] = useState<AiVideoStudioFormValues>({});
  const [detail, setDetail] = useState<AiStudioPublicDocDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [generationTasks, setGenerationTasks] = useState<
    AiVideoMiniStudioGenerationTask[]
  >([]);
  const [activeTaskLocalId, setActiveTaskLocalId] = useState<string | null>(null);
  const [versionPriceLabels, setVersionPriceLabels] = useState<
    Record<string, string>
  >({});

  const availableVersions = useMemo(
    () => getAiVideoStudioVersions(selectedFamilyKey),
    [selectedFamilyKey],
  );
  const selectedVersion = useMemo(
    () =>
      availableVersions.find((version) => version.key === selectedVersionKey) ??
      availableVersions[0] ??
      null,
    [availableVersions, selectedVersionKey],
  );
  const resolvedModelId = useMemo(
    () =>
      selectedVersion
        ? resolveAiVideoStudioModelId({
            familyKey: selectedFamilyKey,
            versionKey: selectedVersion.key,
          })
        : null,
    [selectedFamilyKey, selectedVersion],
  );
  const modelOptions = useMemo<MiniModelSelectorItem[]>(
    () =>
      AI_VIDEO_STUDIO_FAMILIES
        .filter((family) => family.selectable !== false)
        .map((family) => ({
          id: family.key,
          name: family.label,
          description: family.description,
          icon: family.icon,
          tags: family.tags,
          selectable: family.selectable,
        })),
    [],
  );
  const versionsByFamily = useMemo<Record<string, MiniVersionSelectorItem[]>>(
    () =>
      Object.fromEntries(
        AI_VIDEO_STUDIO_FAMILIES.map((family) => [
          family.key,
          family.versions.map((version) => ({
            id: version.key,
            name: version.label,
            description: version.description,
            isSpecial: version.isSpecial === true,
            isHot: version.isHot === true,
            priceLabel:
              versionPriceLabels[`${family.key}::${version.key}`] ?? null,
            levelLimit: getAiVideoStudioLevelLimit(version.levelLimit),
          })),
        ]),
      ),
    [versionPriceLabels],
  );

  useEffect(() => {
    let mounted = true;

    async function loadVersionPrices() {
      try {
        const response = await fetch("/api/ai-studio/families");
        const json = (await response.json()) as FamiliesResponse;
        if (!response.ok || !json.success) {
          return;
        }

        const next: Record<string, string> = {};
        for (const family of json.data.families) {
          for (const version of family.versions) {
            if (version.priceLabel) {
              next[`${family.key}::${version.key}`] = version.priceLabel;
            }
          }
        }

        if (mounted) {
          setVersionPriceLabels(next);
        }
      } catch {
        // keep prices hidden when the lightweight pricing lookup fails
      }
    }

    void loadVersionPrices();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (availableVersions.length === 0) {
      return;
    }

    if (!availableVersions.some((version) => version.key === selectedVersionKey)) {
      setSelectedVersionKey(availableVersions[0]!.key);
    }
  }, [availableVersions, selectedVersionKey]);

  useEffect(() => {
    if (!resolvedModelId) {
      setDetail(null);
      setDetailError(t("form.unsupportedCombination"));
      return;
    }

    let mounted = true;

    async function loadDetail() {
      const requestedModelId = resolvedModelId;
      if (!requestedModelId) {
        return;
      }

      try {
        setDetailError(null);
        const response = await fetch(
          `/api/ai-studio/models/${encodeURIComponent(requestedModelId)}`,
        );
        const json = (await response.json()) as DetailResponse;
        if (!response.ok || !json.success) {
          throw new Error(json.error || t("form.loadModelDetailFailed"));
        }
        if (mounted) {
          setDetail(json.data);
        }
      } catch (error: any) {
        if (mounted) {
          setDetail(null);
          setDetailError(error?.message || t("form.loadModelDetailFailed"));
        }
      }
    }

    void loadDetail();

    return () => {
      mounted = false;
    };
  }, [resolvedModelId, t]);

  const normalizedSchema = useMemo(
    () => (detail ? normalizeAiVideoStudioSchema(detail) : null),
    [detail],
  );
  const primaryFields = useMemo(
    () =>
      getAiVideoMiniStudioPrimaryFields(normalizedSchema?.fields ?? []),
    [normalizedSchema],
  );

  useEffect(() => {
    if (!normalizedSchema) {
      return;
    }

    setFormValues((previous) =>
      mergeAiVideoStudioFormValues({
        fields: normalizedSchema.fields,
        defaults: normalizedSchema.defaults,
        previousValues: previous,
      }),
    );
  }, [normalizedSchema]);

  useEffect(() => {
    if (initialModelId) {
      setSelectedFamilyKey(defaultSelection.familyKey);
      setSelectedVersionKey(defaultSelection.versionKey);
      hasInitializedFromStorageRef.current = true;
    }
  }, [defaultSelection.familyKey, defaultSelection.versionKey, initialModelId]);

  useEffect(() => {
    if (hasInitializedFromStorageRef.current) {
      return;
    }

    if (initialModelId) {
      hasInitializedFromStorageRef.current = true;
      return;
    }

    const rawStoredState = window.localStorage.getItem(AI_VIDEO_STUDIO_FORM_STORAGE_KEY);
    const state = safeParseAiVideoStudioStoredState(rawStoredState);

    if (state) {
      const storedFamily = AI_VIDEO_STUDIO_FAMILIES.find(
        (family) => family.key === state.familyKey && family.selectable !== false,
      );
      const nextFamilyKey = storedFamily?.key ?? defaultSelection.familyKey;
      const nextVersionKey = getAiVideoStudioVersions(nextFamilyKey).some(
        (version) => version.key === state.versionKey,
      )
        ? state.versionKey
        : getAiVideoStudioVersions(nextFamilyKey)[0]?.key ?? defaultSelection.versionKey;

      setSelectedFamilyKey(nextFamilyKey);
      setSelectedVersionKey(nextVersionKey);
      setFormValues(state.formValues);
    }

    hasInitializedFromStorageRef.current = true;
  }, [defaultSelection.familyKey, defaultSelection.versionKey]);

  useEffect(() => {
    if (!hasInitializedFromStorageRef.current) {
      return;
    }

    try {
      window.localStorage.setItem(
        AI_VIDEO_STUDIO_FORM_STORAGE_KEY,
        serializeAiVideoStudioStoredState({
          familyKey: selectedFamilyKey,
          versionKey: selectedVersionKey,
          isPublic: true,
          formValues,
        }),
      );
    } catch {
      // ignore storage errors
    }
  }, [formValues, selectedFamilyKey, selectedVersionKey]);

  const imageValue = primaryFields.imageField
    ? formValues[primaryFields.imageField.key]
    : formValues.image_urls;
  const promptFieldKey = primaryFields.promptField?.key ?? "prompt";
  const promptValue = formValues[promptFieldKey];

  const basePayload = useMemo(
    () =>
      detail
        ? buildAiVideoStudioPayload({
            detail,
            formValues,
          })
        : null,
    [detail, formValues],
  );
  const { selectedPricing, estimatedCredits } = useMemo(
    () =>
      estimateAiVideoMiniStudioCredits({
        modelId: detail?.id ?? null,
        payload: basePayload,
        pricing: detail?.pricing,
        title: detail?.title,
        provider: detail?.provider,
        category: detail?.category,
      }),
    [basePayload, detail],
  );
  const inputPayload = basePayload;
  const requiredFieldValues = useMemo(
    () =>
      normalizedSchema?.fields
        .filter((field) => field.required)
        .map((field) => formValues[field.key]) ?? [],
    [formValues, normalizedSchema],
  );
  const submitState = useMemo(
    () =>
      validateAiVideoMiniStudioSubmission({
        isSubmitting,
        resolvedModelId,
        inputPayload,
        availableCredits: null,
        estimatedCredits,
        requiredFieldValues,
      }),
    [
      estimatedCredits,
      inputPayload,
      isSubmitting,
      requiredFieldValues,
      resolvedModelId,
    ],
  );

  const aspectRatioOptions = getAiVideoMiniStudioFieldOptions(
    primaryFields.aspectRatioField,
  );
  const resolutionOptions = getAiVideoMiniStudioFieldOptions(
    primaryFields.resolutionField,
  );
  const durationOptions = getAiVideoMiniStudioFieldOptions(
    primaryFields.durationField,
  );
  const displayedAspectRatioOptions = aspectRatioOptions;
  const displayedDurationOptions = durationOptions;
  const displayedResolutionOptions = resolutionOptions;
  const currentImagePreview = getImageValue(imageValue);
  const priceLabel = estimatedCredits > 0 ? `${estimatedCredits}` : "-";
  const isGenerateDisabled =
    submitState.reason !== null && (!session?.user || submitState.reason !== "insufficient-credits");

  const updateFormValue = useCallback((key: string, value: unknown) => {
    setFormValues((previous) => ({
      ...previous,
      [key]: value,
    }));
  }, []);

  const updateGenerationTask = useCallback(
    (localId: string, patch: Partial<AiVideoMiniStudioGenerationTask>) => {
      setGenerationTasks((current) =>
        current.map((task) => (task.localId === localId ? { ...task, ...patch } : task)),
      );
    },
    [],
  );

  const increaseTaskProgress = useCallback((localId: string) => {
    setGenerationTasks((current) =>
      current.map((task) =>
        task.localId === localId
          ? {
              ...task,
              progress: Math.min(task.progress + 10, 95),
            }
          : task,
      ),
    );
  }, []);

  const clearTaskPolling = useCallback((localId: string) => {
    const timer = pollingTimersRef.current.get(localId);
    pollingInFlightRef.current.delete(localId);
    if (!timer) {
      return;
    }

    clearTimeout(timer);
    pollingTimersRef.current.delete(localId);
  }, []);

  useEffect(() => {
    return () => {
      pollingTimersRef.current.forEach((timer) => clearTimeout(timer));
      pollingTimersRef.current.clear();
      pollingInFlightRef.current.clear();
    };
  }, []);

  const pollStatus = useCallback(
    (localId: string, taskId: string) => {
      clearTaskPolling(localId);
      const startedAt = Date.now();

      const poll = async () => {
        if (pollingInFlightRef.current.has(localId)) {
          return;
        }

        pollingInFlightRef.current.add(localId);
        let shouldContinue = true;

        try {
          const response = await fetchWithTimeout(
            `/api/ai-studio/tasks/${taskId}`,
            { timeoutMs: 15000 },
          );
          const json = (await response.json()) as TaskResponse;
          if (!response.ok || !json.success) {
            throw new Error(json.error || "Task polling failed");
          }

          const nextState = resolveAiVideoMiniStudioTaskState(json.data.state);

          if (nextState === "succeeded") {
            shouldContinue = false;
            clearTaskPolling(localId);
            updateGenerationTask(localId, {
              state: "succeeded",
              mediaUrls: json.data.mediaUrls,
              failureReason: null,
              progress: 100,
            });
            setActiveTaskLocalId(localId);
            toast.success(t("form.generationCompleted"));
            return;
          }

          if (nextState === "failed") {
            shouldContinue = false;
            clearTaskPolling(localId);
            const failureReason =
              json.data.reason ||
              extractFailureReason(json.data.raw) ||
              t("form.generationFailed");
            updateGenerationTask(localId, {
              state: "failed",
              mediaUrls: json.data.mediaUrls,
              failureReason,
              progress: 100,
            });
            toast.error(failureReason);
            return;
          }

          updateGenerationTask(localId, {
            state: nextState,
            mediaUrls: json.data.mediaUrls,
          });
          increaseTaskProgress(localId);
        } catch {
          increaseTaskProgress(localId);
        } finally {
          pollingInFlightRef.current.delete(localId);
          if (shouldContinue && pollingTimersRef.current.has(localId)) {
            const nextTimer = setTimeout(poll, getTaskPollingDelay(startedAt));
            pollingTimersRef.current.set(localId, nextTimer);
          }
        }
      };

      const timer = setTimeout(poll, getTaskPollingDelay(startedAt));
      pollingTimersRef.current.set(localId, timer);
    },
    [clearTaskPolling, increaseTaskProgress, t, updateGenerationTask],
  );

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error(t("form.imageOnlyError"));
        event.target.value = "";
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(t("form.uploadTooLarge"));
        event.target.value = "";
        return;
      }

      if (!session?.user) {
        setIsLoginDialogOpen(true);
        toast.error(t("form.loginRequired"));
        event.target.value = "";
        return;
      }

      try {
        setIsUploadingImage(true);
        const imageUrl = await uploadReferenceFile({ kind: "image", file });
        const nextValue =
          primaryFields.imageField?.schema.type === "array" ? [imageUrl] : imageUrl;
        updateFormValue(primaryFields.imageField?.key ?? "image_urls", nextValue);
      } catch (error: any) {
        toast.error(error?.message || t("form.uploadFailed"));
      } finally {
        setIsUploadingImage(false);
        event.target.value = "";
      }
    },
    [primaryFields.imageField, session?.user, t, updateFormValue],
  );

  const handleGenerate = useCallback(async () => {
    if (!session?.user) {
      setIsLoginDialogOpen(true);
      toast.error(t("form.loginRequired"));
      return;
    }

    if (submitState.reason === "insufficient-credits") {
      toast.error(t("form.insufficientCredits"));
      return;
    }

    if (submitState.reason === "missing-pricing") {
      toast.error(t("form.modelUnavailable"));
      return;
    }

    if (!submitState.canGenerate || !resolvedModelId || !inputPayload) {
      return;
    }

    const localTask = createAiVideoMiniStudioGenerationTask({
      familyKey: selectedFamilyKey,
      versionKey: selectedVersionKey,
      modelId: resolvedModelId,
      formValues,
      creditsRequired: estimatedCredits,
      promptFieldKey,
    });

    setGenerationTasks((current) => [localTask, ...current]);
    setActiveTaskLocalId(localTask.localId);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/ai-studio/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modelId: resolvedModelId,
          payload: inputPayload,
        }),
      });
      const json = (await response.json()) as ExecuteResponse;
      if (!response.ok || !json.success) {
        throw new Error(json.error || "Execution failed");
      }

      if (!json.data.taskId) {
        throw new Error("Task id is missing");
      }

      updateGenerationTask(localTask.localId, {
        taskId: json.data.taskId,
        state: "queued",
        creditsRequired: json.data.reservedCredits ?? estimatedCredits,
        progress: 10,
      });

      toast.success(t("form.generationQueued"));
      pollStatus(localTask.localId, json.data.taskId);
    } catch (error: any) {
      const failureReason = error?.message || t("form.generationFailed");
      updateGenerationTask(localTask.localId, {
        state: "failed",
        failureReason,
        progress: 100,
      });
      toast.error(failureReason);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    estimatedCredits,
    formValues,
    inputPayload,
    pollStatus,
    promptFieldKey,
    resolvedModelId,
    selectedFamilyKey,
    selectedVersionKey,
    session?.user,
    submitState,
    t,
    updateGenerationTask,
  ]);

  return (
    <div
      data-ai-video-mini-studio
      className="relative rounded-[1.75rem] border border-white/10 bg-white/[0.06] shadow-[0_28px_60px_-36px_rgba(2,8,23,0.65)] backdrop-blur-xl"
    >
      <div className="px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-6">
        <div className="flex gap-4">
          <div className="shrink-0">
            <button
              data-ai-video-mini-studio-upload
              type="button"
              disabled={isUploadingImage}
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.35rem] border border-white/12 bg-white/[0.05] text-white/70 transition hover:border-white/20 hover:bg-white/[0.08] disabled:pointer-events-none disabled:opacity-70 sm:h-28 sm:w-28"
            >
              {currentImagePreview ? (
                <>
                  <img
                    src={currentImagePreview}
                    alt={t("form.referencePreview")}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 bg-black/20" />
                  <span className="absolute bottom-2 left-2 rounded-full bg-black/45 px-2 py-1 text-[11px] font-medium text-white">
                    {t("form.replace")}
                  </span>
                </>
              ) : (
                <span className="flex flex-col items-center gap-2">
                  {isUploadingImage ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <ImagePlus className="h-6 w-6" />
                  )}
                  <span className="text-[11px] font-medium text-white/55">
                    {t("form.reference")}
                  </span>
                </span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative">
              <textarea
                id="hero-prompt"
                value={typeof promptValue === "string" ? promptValue : ""}
                onChange={(event) => updateFormValue(promptFieldKey, event.target.value)}
                className="flex min-h-[110px] w-full resize-none border-0 border-none bg-transparent p-0 text-base text-white shadow-none ring-0 ring-offset-0 transition-all duration-200 placeholder:text-white/25 focus-visible:outline-none focus-visible:ring-0 sm:min-h-[120px] sm:text-lg"
                placeholder={t("form.promptPlaceholder")}
              />
              {detailError ? (
                <p className="mt-2 text-xs text-amber-200/80">{detailError}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 border-t border-white/8 px-5 py-3.5 sm:px-7">
        <div
          data-ai-video-mini-studio-model
          className="min-w-0"
        >
          <MiniModelVersionSelector
            models={modelOptions}
            versionsByFamily={versionsByFamily}
            selectedFamilyKey={selectedFamilyKey}
            selectedVersionKey={selectedVersionKey}
            onSelect={({ familyKey, versionKey }) => {
              setSelectedFamilyKey(familyKey);
              setSelectedVersionKey(versionKey);
            }}
            searchPlaceholder="Search..."
            allModelsLabel="All models"
          />
        </div>

        {displayedAspectRatioOptions.length > 0 ? (
          <div data-ai-video-mini-studio-aspect-ratio className="min-w-0">
            <Select
              value={String(
                formValues[primaryFields.aspectRatioField?.key ?? "aspect_ratio"] ??
                  displayedAspectRatioOptions[0],
              )}
              onValueChange={(value) =>
                updateFormValue(
                  primaryFields.aspectRatioField?.key ?? "aspect_ratio",
                  coerceAiVideoMiniStudioFieldValue(
                    primaryFields.aspectRatioField,
                    value,
                  ),
                )
              }
            >
              <SelectTrigger
                aria-label={t("form.aspectRatio")}
                className="h-9 w-[65px] rounded-full border-white/12 bg-white/6 px-2 py-2 text-[12px] font-medium text-white/80 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] hover:border-white/20"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                align="start"
                className="border-white/12 bg-slate-950 text-white"
              >
                {displayedAspectRatioOptions.map((option) => (
                  <SelectItem key={String(option)} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {displayedDurationOptions.length > 0 ? (
          <div data-ai-video-mini-studio-duration className="min-w-0">
            <Select
              value={String(
                formValues[primaryFields.durationField?.key ?? "duration"] ??
                  displayedDurationOptions[0],
              )}
              onValueChange={(value) =>
                updateFormValue(
                  primaryFields.durationField?.key ?? "duration",
                  coerceAiVideoMiniStudioFieldValue(
                    primaryFields.durationField,
                    value,
                  ),
                )
              }
            >
              <SelectTrigger
                aria-label={t("form.duration")}
                className="h-9 w-[60px] rounded-full border-white/12 bg-white/6 px-2 py-2 text-[12px] font-medium text-white/80 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] hover:border-white/20"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                align="start"
                className="border-white/12 bg-slate-950 text-white"
              >
                {displayedDurationOptions.map((option) => (
                  <SelectItem key={String(option)} value={String(option)}>
                    {formatDurationOptionLabel(
                      primaryFields.durationField?.key ?? "duration",
                      option,
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {displayedResolutionOptions.length > 0 ? (
          <div data-ai-video-mini-studio-resolution className="min-w-0">
            <Select
              value={String(
                formValues[primaryFields.resolutionField?.key ?? "resolution"] ??
                  displayedResolutionOptions[0],
              )}
              onValueChange={(value) =>
                updateFormValue(
                  primaryFields.resolutionField?.key ?? "resolution",
                  coerceAiVideoMiniStudioFieldValue(
                    primaryFields.resolutionField,
                    value,
                  ),
                )
              }
            >
              <SelectTrigger
                aria-label={t("form.resolution")}
                className="h-9 w-[70px] rounded-full border-white/12 bg-white/6 px-2 py-2 text-[12px] font-medium text-white/80 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] hover:border-white/20"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                align="start"
                className="border-white/12 bg-slate-950 text-white"
              >
                {displayedResolutionOptions.map((option) => (
                  <SelectItem key={String(option)} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {currentImagePreview ? (
            <button
              type="button"
              onClick={() =>
                updateFormValue(
                  primaryFields.imageField?.key ?? "image_urls",
                  primaryFields.imageField?.schema.type === "array" ? [] : "",
                )
              }
              className="inline-flex h-9 items-center justify-center rounded-full border border-white/12 bg-white/6 px-3 text-[13px] font-medium text-white/70 transition hover:border-white/20 hover:text-white"
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              {t("form.remove")}
            </button>
          ) : null}
          <span
            data-ai-video-mini-studio-price
            className="flex items-center gap-1 text-xs text-white/50"
          >
            <Zap className="h-3 w-3" />
            {priceLabel}
          </span>
          <button
            data-ai-video-mini-studio-submit
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isGenerateDisabled}
            className={cn(
              "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full px-5 text-[13px] font-semibold text-white ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "bg-[linear-gradient(135deg,hsl(var(--secondary))_0%,hsl(var(--primary))_100%)] shadow-[0_22px_38px_-22px_rgba(15,23,42,0.82)]",
              "hover:-translate-y-0.5 hover:brightness-110 disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            {isSubmitting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            {isSubmitting ? t("form.generating") : t("form.generate")}
          </button>
        </div>
      </div>

      <AIVideoMiniStudioTaskHistory
        tasks={generationTasks}
        activeTaskLocalId={activeTaskLocalId}
        onOpenVideos={() => router.push("/dashboard/videos")}
        texts={{
          historyTitle: t("form.tasks"),
          historyHint: t("form.historyHint"),
          queuedOrRunning: (progress) => `${t("form.generating")} ${progress}%`,
          succeeded: t("form.readyToPreview"),
          failed: t("form.generationFailed"),
          creditsRequired: (count) => t("form.creditsRequired", { count }),
          task: (index) => t("form.task", { index }),
          openVideos: t("form.viewResult"),
        }}
      />

      {isLoginDialogOpen ? (
        <Suspense fallback={null}>
          <LoginDialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen} />
        </Suspense>
      ) : null}
    </div>
  );
}
