"use client";

import AIVideoStudioFields from "@/components/ai/AIVideoStudioFields";
import {
  AI_VIDEO_STUDIO_FAMILIES,
  getAiVideoStudioVersions,
  type AiVideoStudioFamilyKey,
  type AiVideoStudioVersionKey,
  resolveAiVideoStudioModelId,
} from "@/config/ai-video-studio";
import { useUserBenefits } from "@/hooks/useUserBenefits";
import { authClient } from "@/lib/auth/auth-client";
import {
  buildAiVideoStudioPayload,
  restoreAiVideoStudioFormState,
  type AiVideoStudioFormValues,
} from "@/lib/ai-video-studio/adapter";
import {
  AI_VIDEO_STUDIO_FORM_STORAGE_KEY,
  safeParseAiVideoStudioStoredState,
  serializeAiVideoStudioStoredState,
} from "@/lib/ai-video-studio/storage";
import { hasAiVideoStudioSignedInSession } from "@/lib/ai-video-studio/view";
import { normalizeAiVideoStudioSchema } from "@/lib/ai-video-studio/schema";
import type {
  AiStudioPublicDocDetail,
  AiStudioPublicPricingRow,
} from "@/lib/ai-studio/public";
import {
  guessPricingRow,
  toBillableCredits,
} from "@/lib/ai-studio/runtime";
import { cn } from "@/lib/utils";
import {
  Copy,
  Download,
  Loader2,
  Play,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import HeroPromptCarousel from "@/components/home/seedance/HeroPromptCarousel";
import {
  ModelSelector,
  type ModelSelectorItem,
  type ModelSelectorVersionItem,
} from "@/components/home/seedance/ModelSelector";

type DetailResponse = {
  success: boolean;
  data: AiStudioPublicDocDetail;
  error?: string;
};

type ExecuteResponse = {
  success: boolean;
  data: {
    generationId?: string | null;
    reservedCredits?: number;
    state?: string;
    taskId?: string | null;
    statusSupported: boolean;
    mediaUrls: string[];
    selectedPricing?: AiStudioPublicPricingRow | null;
  };
  error?: string;
};

type TaskResponse = {
  success: boolean;
  data: {
    state: string;
    mediaUrls: string[];
  };
  error?: string;
};

type GenerationTaskState = "queued" | "running" | "succeeded" | "failed";

type GenerationTask = {
  localId: string;
  taskId?: string;
  state: GenerationTaskState;
  mediaUrls: string[];
  familyKey: AiVideoStudioFamilyKey;
  versionKey: AiVideoStudioVersionKey;
  modelId: string;
  prompt: string;
  isPublic: boolean;
  formValues: AiVideoStudioFormValues;
  payload: Record<string, any>;
  creditsRequired: number;
  selectedPricing: AiStudioPublicPricingRow | null;
  progress: number;
  createdAt: number;
};

function createLocalTaskId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function hasRequiredFieldValue(value: unknown) {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

function hasFilledValue(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

function getValueAtPath(
  source: Record<string, unknown>,
  path: string[],
) {
  let current: unknown = source;

  for (const segment of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function setValueAtPath(
  source: Record<string, unknown>,
  path: string[],
  value: unknown,
) {
  const next = structuredClone(source);
  let cursor = next;

  for (let index = 0; index < path.length - 1; index += 1) {
    const segment = path[index]!;
    const current = cursor[segment];

    if (!current || typeof current !== "object" || Array.isArray(current)) {
      cursor[segment] = {};
    }

    cursor = cursor[segment] as Record<string, unknown>;
  }

  cursor[path[path.length - 1]!] = value;
  return next;
}

function findValueByKey(
  source: Record<string, unknown>,
  key: string,
): unknown {
  if (key in source) {
    return source[key];
  }

  for (const value of Object.values(source)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }

    const nested = findValueByKey(value as Record<string, unknown>, key);
    if (nested !== undefined) {
      return nested;
    }
  }

  return undefined;
}

export default function AIVideoStudio() {
  const t = useTranslations("Landing.Hero");
  const { data: session } = authClient.useSession();
  const {
    benefits,
    isLoading: isLoadingBenefits,
    mutate: refreshBenefits,
    optimisticDeduct,
  } = useUserBenefits();
  const hasInitializedFromStorageRef = useRef(false);
  const pollingTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const [selectedFamilyKey, setSelectedFamilyKey] =
    useState<AiVideoStudioFamilyKey>("sora2");
  const [selectedVersionKey, setSelectedVersionKey] =
    useState<AiVideoStudioVersionKey>("sora-2");
  const [detail, setDetail] = useState<AiStudioPublicDocDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<AiVideoStudioFormValues>({});
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generationTasks, setGenerationTasks] = useState<GenerationTask[]>([]);
  const [activeTaskLocalId, setActiveTaskLocalId] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const availableFamilies = AI_VIDEO_STUDIO_FAMILIES;
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
    [selectedFamilyKey, selectedVersionKey, selectedVersion],
  );

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
      setDetailLoading(true);
      setDetailError(null);
      try {
        const response = await fetch(
          `/api/ai-studio/models/${encodeURIComponent(requestedModelId)}`,
        );
        const json = (await response.json()) as DetailResponse;
        if (!response.ok || !json.success) {
          throw new Error(json.error || "Failed to load model detail");
        }
        if (!mounted) {
          return;
        }
        setDetail(json.data);
      } catch (error: any) {
        if (!mounted) {
          return;
        }
        setDetail(null);
        setDetailError(error?.message || "Failed to load model detail");
      } finally {
        if (mounted) {
          setDetailLoading(false);
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

  useEffect(() => {
    if (!normalizedSchema) {
      return;
    }

    setFormValues((previous) => {
      let next: AiVideoStudioFormValues = {};

      for (const field of normalizedSchema.fields) {
        const previousValue = getValueAtPath(previous, field.path);
        const defaultValue = getValueAtPath(normalizedSchema.defaults, field.path);
        next = setValueAtPath(
          next,
          field.path,
          hasFilledValue(previousValue) ? previousValue : defaultValue,
        );
      }

      return next;
    });
  }, [normalizedSchema]);

  useEffect(() => {
    if (hasInitializedFromStorageRef.current) {
      return;
    }

    const rawNewState = window.localStorage.getItem(AI_VIDEO_STUDIO_FORM_STORAGE_KEY);
    const state = safeParseAiVideoStudioStoredState(rawNewState);
    if (state) {
      setSelectedFamilyKey(state.familyKey);
      setSelectedVersionKey(state.versionKey);
      setFormValues(state.formValues);
      setIsPublic(state.isPublic);
      hasInitializedFromStorageRef.current = true;
      return;
    }

    hasInitializedFromStorageRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasInitializedFromStorageRef.current) {
      return;
    }

    const serialized = serializeAiVideoStudioStoredState({
      familyKey: selectedFamilyKey,
      versionKey: selectedVersionKey,
      isPublic,
      formValues,
    });

    try {
      window.localStorage.setItem(AI_VIDEO_STUDIO_FORM_STORAGE_KEY, serialized);
    } catch {
      // ignore storage errors
    }
  }, [formValues, isPublic, selectedFamilyKey, selectedVersionKey]);

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

  const selectedPricing = useMemo(
    () =>
      detail && basePayload
        ? guessPricingRow(detail.pricingRows, basePayload)
        : null,
    [basePayload, detail],
  );

  const inputPayload = useMemo(
    () =>
      detail && basePayload
        ? buildAiVideoStudioPayload({
            detail,
            formValues,
            selectedPricing,
          })
        : null,
    [basePayload, detail, formValues, selectedPricing],
  );

  const estimatedCredits = useMemo(
    () => toBillableCredits(selectedPricing?.creditPrice),
    [selectedPricing],
  );
  const shouldShowPublicInAdvanced =
    normalizedSchema?.usesDefaultAdvancedGrouping === true ||
    selectedFamilyKey === "seedance-2.0";

  const availableCredits = benefits?.totalAvailableCredits ?? null;
  const hasSignedInSession = hasAiVideoStudioSignedInSession(session);
  const hasRequiredFieldValues = useMemo(
    () =>
      !normalizedSchema?.fields.some(
        (field) =>
          field.required &&
          !hasRequiredFieldValue(getValueAtPath(formValues, field.path)),
      ),
    [formValues, normalizedSchema],
  );

  const canGenerate =
    !isSubmitting &&
    !!resolvedModelId &&
    !!inputPayload &&
    (!session?.user ||
      availableCredits === null ||
      availableCredits >= estimatedCredits) &&
    hasRequiredFieldValues;

  const updateGenerationTask = useCallback(
    (localId: string, patch: Partial<GenerationTask>) => {
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
    if (!timer) {
      return;
    }

    clearInterval(timer);
    pollingTimersRef.current.delete(localId);
  }, []);

  const pollStatus = useCallback(
    (localId: string, taskId: string, modelId: string) => {
      clearTaskPolling(localId);

      const timer = setInterval(async () => {
        try {
          const response = await fetch(
            `/api/ai-studio/tasks/${taskId}?modelId=${encodeURIComponent(modelId)}`,
          );
          const json = (await response.json()) as TaskResponse;
          if (!response.ok || !json.success) {
            throw new Error(json.error || "Task polling failed");
          }

          if (json.data.state === "succeeded") {
            clearTaskPolling(localId);
            updateGenerationTask(localId, {
              state: "succeeded",
              mediaUrls: json.data.mediaUrls,
              progress: 100,
            });
            setActiveTaskLocalId(localId);
            toast.success(t("form.generationSuccess"));
            void refreshBenefits();
          } else if (json.data.state === "failed") {
            clearTaskPolling(localId);
            updateGenerationTask(localId, {
              state: "failed",
              progress: 100,
            });
            toast.error(t("form.generationFailed"));
            void refreshBenefits();
          } else {
            updateGenerationTask(localId, {
              state: json.data.state === "queued" ? "queued" : "running",
              mediaUrls: json.data.mediaUrls,
            });
            increaseTaskProgress(localId);
          }
        } catch {
          increaseTaskProgress(localId);
        }
      }, 5000);

      pollingTimersRef.current.set(localId, timer);
    },
    [clearTaskPolling, increaseTaskProgress, refreshBenefits, t, updateGenerationTask],
  );

  useEffect(() => {
    return () => {
      pollingTimersRef.current.forEach((timer) => clearInterval(timer));
      pollingTimersRef.current.clear();
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    if (isSubmitting || !resolvedModelId || !inputPayload) {
      return;
    }

    if (!session?.user) {
      toast.error(t("form.loginRequired"));
      return;
    }

    if (availableCredits !== null && availableCredits < estimatedCredits) {
      toast.error(t("form.insufficientCredits"));
      return;
    }

    const localTaskId = createLocalTaskId();
    const promptValue = findValueByKey(formValues, "prompt");
    const prompt =
      typeof promptValue === "string" && promptValue.trim().length > 0
        ? promptValue.trim()
        : "-";

    setGenerationTasks((current) => [
      {
        localId: localTaskId,
        state: "queued",
        mediaUrls: [],
        familyKey: selectedFamilyKey,
        versionKey: selectedVersionKey,
        modelId: resolvedModelId,
        prompt,
        isPublic,
        formValues: { ...formValues },
        payload: structuredClone(inputPayload),
        creditsRequired: estimatedCredits,
        selectedPricing,
        progress: 5,
        createdAt: Date.now(),
      },
      ...current,
    ]);
    setActiveTaskLocalId(localTaskId);
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

      if ((json.data.reservedCredits ?? 0) > 0) {
        optimisticDeduct(json.data.reservedCredits ?? 0);
      }

      updateGenerationTask(localTaskId, {
        taskId: json.data.taskId ?? undefined,
        state:
          json.data.state === "succeeded"
            ? "succeeded"
            : json.data.state === "failed"
              ? "failed"
              : "queued",
        mediaUrls: json.data.mediaUrls ?? [],
        selectedPricing: json.data.selectedPricing ?? selectedPricing,
        creditsRequired: json.data.reservedCredits ?? estimatedCredits,
        progress: json.data.state === "succeeded" || !json.data.taskId ? 100 : 10,
      });

      if (json.data.state === "succeeded" || !json.data.taskId) {
        toast.success(t("form.generationSuccess"));
        void refreshBenefits();
      } else {
        pollStatus(localTaskId, json.data.taskId, resolvedModelId);
      }
    } catch (error: any) {
      updateGenerationTask(localTaskId, {
        state: "failed",
        progress: 100,
      });
      toast.error(error?.message || t("form.generationFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    availableCredits,
    estimatedCredits,
    formValues,
    inputPayload,
    isPublic,
    isSubmitting,
    optimisticDeduct,
    pollStatus,
    refreshBenefits,
    resolvedModelId,
    selectedFamilyKey,
    selectedPricing,
    selectedVersionKey,
    session,
    t,
    updateGenerationTask,
  ]);

  const activeTask = useMemo(() => {
    if (generationTasks.length === 0) {
      return null;
    }

    if (!activeTaskLocalId) {
      return generationTasks[0];
    }

    return generationTasks.find((task) => task.localId === activeTaskLocalId) ?? generationTasks[0];
  }, [activeTaskLocalId, generationTasks]);

  const activeResultVideoUrl = activeTask?.mediaUrls[0] ?? null;

  const handleCopyPrompt = useCallback(
    async (prompt: string) => {
      try {
        await navigator.clipboard.writeText(prompt);
        toast.success(t("form.promptCopied"));
      } catch {
        toast.error(t("form.copyFailed"));
      }
    },
    [t],
  );

  const handleDownloadVideo = useCallback((url: string, taskId: string | undefined) => {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.download = `video-task-${taskId || Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, []);

  const handleRemixTask = useCallback(
    (task: GenerationTask) => {
      const restored = restoreAiVideoStudioFormState({
        familyKey: task.familyKey,
        versionKey: task.versionKey,
        isPublic: task.isPublic,
        payload: task.payload,
      });

      setSelectedFamilyKey(restored.familyKey);
      setSelectedVersionKey(restored.versionKey);
      setIsPublic(restored.isPublic);
      setFormValues(restored.formValues);
      setActiveTaskLocalId(task.localId);
      toast.success(t("form.remixApplied"));
    },
    [t],
  );

  const getTaskParamsLine = useCallback(
    (task: GenerationTask) => {
      const parts: string[] = [];
      const aspectRatio = findValueByKey(task.formValues, "aspect_ratio");
      const duration = findValueByKey(task.formValues, "duration");
      const frames = findValueByKey(task.formValues, "n_frames");

      if (typeof aspectRatio === "string" && aspectRatio) {
        parts.push(`aspect_ratio: ${aspectRatio}`);
      }

      if (
        (typeof duration === "string" && duration) ||
        typeof duration === "number"
      ) {
        parts.push(`duration: ${duration}s`);
      } else if (typeof frames === "string" && frames) {
        parts.push(`n_frames: ${frames}`);
      }

      parts.push(task.isPublic ? "public" : "private");

      return parts.join(" · ");
    },
    [],
  );

  const modelOptions = useMemo<ModelSelectorItem[]>(
    () =>
      availableFamilies.map((family) => ({
        id: family.key,
        name: family.label,
        description: family.description,
        tags: family.tags,
        selectable: family.selectable,
      })),
    [availableFamilies],
  );
  const versionOptions = useMemo<ModelSelectorVersionItem[]>(
    () =>
      availableVersions.map((version) => ({
        id: version.key,
        name: version.label,
      })),
    [availableVersions],
  );

  return (
    <main className="flex flex-1 flex-col items-center container px-4">
      <div className="w-full min-w-0 max-w-7xl mx-auto">
        <div className="flex w-full min-w-0 flex-col items-start gap-8 my-10 h-full mx-auto p-2 lg:p-6 rounded-xl lg:rounded-3xl border border-border/50 bg-card shadow-xl lg:flex-row">
          <div className="w-full lg:w-[400px] xl:w-[450px] flex-shrink-0 flex flex-col gap-5 h-fit">
            <ModelSelector
              selectedId={selectedFamilyKey}
              onSelect={(nextKey) => setSelectedFamilyKey(nextKey as AiVideoStudioFamilyKey)}
              models={modelOptions}
              label={t("form.aiModel")}
              placeholder={t("form.selectModel")}
              versions={versionOptions}
              selectedVersionId={selectedVersionKey}
              onSelectVersion={(nextVersionKey) =>
                setSelectedVersionKey(nextVersionKey as AiVideoStudioVersionKey)
              }
              versionLabel={t("form.modelVersion")}
            />

            {detailLoading ? (
              <div className="rounded-xl border border-border/60 bg-background/40 px-4 py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading model settings...</span>
              </div>
            ) : detailError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {detailError}
              </div>
            ) : normalizedSchema ? (
              <AIVideoStudioFields
                primaryFields={normalizedSchema.primaryFields}
                advancedFields={normalizedSchema.advancedFields}
                advancedLabel={t("form.advanced")}
                localizedFieldLabels={{
                  prompt: t("form.prompt"),
                  size: t("form.size"),
                  resolution: t("form.resolution"),
                  aspectRatio: t("form.aspectRatio"),
                  duration: t("form.duration"),
                  referenceAudios: t("form.referenceAudios"),
                  referenceImages: t("form.referenceImages"),
                  referenceVideos: t("form.referenceVideos"),
                  referenceUrls: t("form.referenceUrls"),
                }}
                publicVisibilityLabel={t("form.isPublic")}
                publicToggleLabel={t("form.public")}
                promptPlaceholder={t("form.promptPlaceholder")}
                referenceFieldTexts={{
                  useUrlLabel: t("form.useUrl"),
                  uploadTitle: t("form.uploadTitle"),
                  addButton: t("form.add"),
                  removeButton: t("form.remove"),
                  audioFormats: t("form.audioUploadFormats"),
                  imageFormats: t("form.imageUploadFormats"),
                  videoFormats: t("form.videoUploadFormats"),
                  audioDescription: (max) =>
                    t("form.audioReferenceHint", { count: max }),
                  imageDescription: (max) =>
                    t("form.imageReferenceHint", { count: max }),
                  videoDescription: (max) =>
                    t("form.videoReferenceHint", { count: max }),
                  urlDescription: (max) =>
                    t("form.urlReferenceHint", { count: max }),
                  countLabel: (current, max) =>
                    t("form.referencesCount", { current, max }),
                  invalidUrl: t("form.invalidUrl"),
                  uploadFailed: t("form.referenceUploadFailed"),
                  uploading: t("form.uploadingReference"),
                  audioOnlyError: t("form.audioOnlyError"),
                  imageOnlyError: t("form.imageOnlyError"),
                  videoOnlyError: t("form.videoOnlyError"),
                  uploadTooLarge: (sizeInMb) =>
                    t("form.referenceUploadTooLarge", { size: sizeInMb }),
                  audioUrlPlaceholder: t("form.audioUrlPlaceholder"),
                  imageUrlPlaceholder: t("form.imageUrlPlaceholder"),
                  videoUrlPlaceholder: t("form.videoUrlPlaceholder"),
                  genericUrlPlaceholder: t("form.genericUrlPlaceholder"),
                }}
                showPublicInAdvanced={shouldShowPublicInAdvanced}
                values={formValues}
                isPublic={isPublic}
                disabled={isSubmitting}
                onChange={(path, nextValue) =>
                  setFormValues((current) => setValueAtPath(current, path, nextValue))
                }
                onPublicChange={setIsPublic}
              />
            ) : null}

            {hasSignedInSession ? (
              <div className="rounded-xl border border-border/60 bg-background/40 px-4 py-2.5 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{t("form.currentCredits")}</div>
                <div className="font-semibold text-foreground">
                  {isLoadingBenefits
                    ? "--"
                    : t("form.creditsRequired", { count: availableCredits ?? 0 })}
                </div>
              </div>
            ) : null}

            <div className="pt-4 mt-auto">
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={!canGenerate}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 w-full h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg shadow-purple-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <div className="flex items-center justify-center gap-2 relative z-10">
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5 fill-white/20" />
                  )}
                  <span>
                    {isSubmitting
                      ? t("form.generating")
                      : `${t("form.generate")} (${t("form.creditsRequired", { count: estimatedCredits })})`}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {generationTasks.length > 0 ? (
            <div className="flex-1 w-full rounded-xl border border-border/50 bg-muted/10 backdrop-blur-sm overflow-hidden relative flex flex-col shadow-sm">
              <div className="flex-1 min-h-0 h-full bg-muted/30 flex flex-col p-3 gap-3">
                <div className="relative rounded-2xl overflow-hidden bg-black h-[clamp(180px,36vh,420px)] lg:h-[clamp(220px,42vh,520px)] shrink-0">
                  <div className="h-full w-full">
                    {activeTask && (activeTask.state === "queued" || activeTask.state === "running") ? (
                      <div className="flex flex-col items-center justify-center h-full w-full gap-3">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
                        <p className="text-white/80 text-sm">{t("form.generating")}</p>
                        <p className="text-white/60 text-xs">{activeTask.progress}%</p>
                      </div>
                    ) : activeResultVideoUrl ? (
                      <video
                        key={activeTask?.localId || activeResultVideoUrl}
                        src={activeResultVideoUrl}
                        playsInline
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                      />
                    ) : activeTask?.state === "failed" ? (
                      <div className="flex flex-col items-center justify-center h-full w-full gap-3 text-white/75">
                        <X className="w-8 h-8" />
                        <p className="text-sm">{t("form.generationFailed")}</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex-1 min-h-0 rounded-2xl border border-border/60 bg-background/50 p-3 flex flex-col">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{t("form.tasks")}</h3>
                    <span className="text-xs text-muted-foreground">{generationTasks.length}</span>
                  </div>
                  <div className="mt-3 flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
                    {generationTasks.map((task, index) => (
                      <div
                        key={task.localId}
                        onClick={() => setActiveTaskLocalId(task.localId)}
                        className={cn(
                          "w-full text-left rounded-xl border p-3 transition-colors cursor-pointer",
                          activeTask?.localId === task.localId
                            ? "border-blue-500/70 bg-blue-500/10"
                            : "border-border/60 bg-background/60 hover:bg-muted/40",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-36 h-24 rounded-lg overflow-hidden bg-black shrink-0 border border-border/50">
                            {task.mediaUrls[0] ? (
                              <video
                                src={task.mediaUrls[0]}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedVideo(task.mediaUrls[0] || null);
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[11px] text-white/70">
                                {task.state === "failed" ? t("form.generationFailed") : t("form.generating")}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                <span>{t("form.task", { index: generationTasks.length - index })}</span>
                                {task.taskId ? (
                                  <span
                                    className="font-mono text-[10px] text-muted-foreground bg-background/50 border border-border/50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted transition-colors flex items-center gap-1"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      navigator.clipboard.writeText(task.taskId!);
                                      toast.success("Task ID copied");
                                    }}
                                    title="Copy Task ID"
                                  >
                                    {task.taskId}
                                    <Copy className="w-2.5 h-2.5" />
                                  </span>
                                ) : null}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {new Date(task.createdAt).toLocaleTimeString()}
                              </div>
                            </div>
                            <div className="mt-1 text-[11px] text-muted-foreground truncate">
                              {availableVersions.find((version) => version.key === task.versionKey)?.label ?? task.versionKey}
                              {" · "}
                              {t("form.creditsRequired", { count: task.creditsRequired })}
                              {" · "}
                              {getTaskParamsLine(task)}
                            </div>
                            <div className="mt-1 text-xs text-foreground/90 break-words max-h-10 overflow-hidden">
                              {task.prompt}
                            </div>
                            {task.state !== "succeeded" ? (
                              <>
                                <div className="mt-2 h-1.5 rounded-full bg-muted">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all",
                                      task.state === "failed" ? "bg-red-500" : "bg-blue-500",
                                    )}
                                    style={{ width: `${task.progress}%` }}
                                  />
                                </div>
                                <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1.5">
                                  {task.state === "queued" || task.state === "running" ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : null}
                                  <span>
                                    {task.state === "failed"
                                      ? t("form.generationFailed")
                                      : `${t("form.generating")} ${task.progress}%`}
                                  </span>
                                </div>
                              </>
                            ) : null}

                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (task.mediaUrls[0]) {
                                    setSelectedVideo(task.mediaUrls[0]);
                                  }
                                }}
                                disabled={!task.mediaUrls[0]}
                                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] disabled:opacity-50"
                              >
                                <Play className="w-3 h-3" />
                                {t("form.openVideo")}
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (task.mediaUrls[0]) {
                                    handleDownloadVideo(task.mediaUrls[0], task.taskId);
                                  }
                                }}
                                disabled={!task.mediaUrls[0]}
                                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px] disabled:opacity-50"
                              >
                                <Download className="w-3 h-3" />
                                {t("form.downloadVideo")}
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleCopyPrompt(task.prompt);
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px]"
                              >
                                <Copy className="w-3 h-3" />
                                {t("form.copyPrompt")}
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRemixTask(task);
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-1 text-[11px]"
                              >
                                <WandSparkles className="w-3 h-3" />
                                {t("form.remix")}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full min-w-0 overflow-hidden">
              <HeroPromptCarousel onPlayVideo={setSelectedVideo} />
            </div>
          )}
        </div>
      </div>

      {selectedVideo && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => setSelectedVideo(null)}
                className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors z-10"
              >
                <X className="w-8 h-8" />
              </button>

              <div className="relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
                <video
                  src={selectedVideo || undefined}
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
            document.body,
          )
        : null}
    </main>
  );
}
