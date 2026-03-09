"use client";

import AIVideoStudioFields from "@/components/ai/AIVideoStudioFields";
import {
  AI_VIDEO_STUDIO_FAMILIES,
  getAiVideoStudioVersions,
  resolveAiVideoStudioModelId,
  type AiVideoStudioFamilyKey,
  type AiVideoStudioMode,
  type AiVideoStudioVersionKey,
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
  safeParseVideoRemixPayload,
  safeParseVideoStudioFormPayload,
  VIDEO_REMIX_STORAGE_KEY,
  VIDEO_STUDIO_FORM_STORAGE_KEY,
} from "@/lib/video/remix";
import {
  Copy,
  Download,
  Image as ImageIcon,
  Loader2,
  Play,
  Sparkles,
  Type,
  WandSparkles,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
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
  mode: AiVideoStudioMode;
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

function getLegacyVersionKey(versionKey: string | undefined): AiVideoStudioVersionKey {
  return versionKey?.toLowerCase().includes("pro") ? "sora-2-pro" : "sora-2";
}

function normalizeLegacyDuration(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const match = value.match(/\d+/);
  return match?.[0];
}

function hasImageInput(value: unknown) {
  if (Array.isArray(value)) {
    return value.some((item) => typeof item === "string" && item.length > 0);
  }

  return typeof value === "string" && value.length > 0;
}

export default function AIVideoStudio() {
  const t = useTranslations("Landing.Hero");
  const searchParams = useSearchParams();
  const { data: session } = authClient.useSession();
  const {
    benefits,
    isLoading: isLoadingBenefits,
    mutate: refreshBenefits,
    optimisticDeduct,
  } = useUserBenefits();
  const hasInitializedFromStorageRef = useRef(false);
  const pollingTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const [mode, setMode] = useState<AiVideoStudioMode>("text-to-video");
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
  const supportedModes = useMemo(
    () =>
      (["text-to-video", "image-to-video"] as const).filter(
        (candidateMode) => typeof selectedVersion?.modelIds[candidateMode] === "string",
      ),
    [selectedVersion],
  );
  const resolvedModelId = useMemo(
    () =>
      selectedVersion
        ? resolveAiVideoStudioModelId({
            familyKey: selectedFamilyKey,
            versionKey: selectedVersion.key,
            mode,
          })
        : null,
    [mode, selectedFamilyKey, selectedVersionKey],
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
    if (supportedModes.length === 0) {
      return;
    }

    if (!supportedModes.includes(mode)) {
      setMode(supportedModes[0]!);
    }
  }, [mode, supportedModes]);

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
      const next: AiVideoStudioFormValues = {};

      for (const field of normalizedSchema.fields) {
        const previousValue = previous[field.key];
        next[field.key] =
          previousValue !== undefined &&
          previousValue !== "" &&
          (!Array.isArray(previousValue) || previousValue.length > 0)
            ? previousValue
            : normalizedSchema.defaults[field.key];
      }

      return next;
    });
  }, [normalizedSchema]);

  useEffect(() => {
    if (hasInitializedFromStorageRef.current) {
      return;
    }

    const applyNewState = (state: ReturnType<typeof safeParseAiVideoStudioStoredState>) => {
      if (!state) {
        return false;
      }

      setMode(state.mode);
      setSelectedFamilyKey(state.familyKey);
      setSelectedVersionKey(state.versionKey);
      setFormValues(state.formValues);
      setIsPublic(state.isPublic);
      return true;
    };

    const applyLegacyPayload = (
      payload:
        | ReturnType<typeof safeParseVideoRemixPayload>
        | ReturnType<typeof safeParseVideoStudioFormPayload>,
    ) => {
      if (!payload) {
        return false;
      }

      setMode(payload.mode === "image-to-video" ? "image-to-video" : "text-to-video");
      setSelectedFamilyKey("sora2");
      setSelectedVersionKey(getLegacyVersionKey(payload.versionKey));
      setIsPublic(typeof payload.isPublic === "boolean" ? payload.isPublic : true);
      setFormValues({
        ...(payload.providerValues?.prompt
          ? {
              prompt: payload.providerValues.prompt,
            }
          : {}),
        ...(payload.providerValues?.imageUrl
          ? {
              image_urls: [payload.providerValues.imageUrl],
            }
          : {}),
        ...(payload.providerValues?.aspectRatio
          ? {
              aspect_ratio: payload.providerValues.aspectRatio,
            }
          : {}),
        ...(payload.providerValues?.duration
          ? {
              n_frames: normalizeLegacyDuration(payload.providerValues.duration),
            }
          : {}),
      });

      return true;
    };

    const isRemix = searchParams.get("remix") === "1";
    if (isRemix) {
      const rawLegacyRemix = window.localStorage.getItem(VIDEO_REMIX_STORAGE_KEY);
      const applied = applyLegacyPayload(safeParseVideoRemixPayload(rawLegacyRemix));
      window.localStorage.removeItem(VIDEO_REMIX_STORAGE_KEY);
      if (applied) {
        toast.success(t("form.remixApplied"));
        hasInitializedFromStorageRef.current = true;
        return;
      }
    }

    const rawNewState = window.localStorage.getItem(AI_VIDEO_STUDIO_FORM_STORAGE_KEY);
    if (applyNewState(safeParseAiVideoStudioStoredState(rawNewState))) {
      hasInitializedFromStorageRef.current = true;
      return;
    }

    const rawLegacyState = window.localStorage.getItem(VIDEO_STUDIO_FORM_STORAGE_KEY);
    applyLegacyPayload(safeParseVideoStudioFormPayload(rawLegacyState));
    hasInitializedFromStorageRef.current = true;
  }, [searchParams, t]);

  useEffect(() => {
    if (!hasInitializedFromStorageRef.current) {
      return;
    }

    const serialized = serializeAiVideoStudioStoredState({
      mode,
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
  }, [formValues, isPublic, mode, selectedFamilyKey, selectedVersionKey]);

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

  const availableCredits = benefits?.totalAvailableCredits ?? null;
  const requiresPrompt = normalizedSchema?.requiresPrompt ?? false;
  const requiresImage = normalizedSchema?.requiresImage ?? false;

  const canGenerate =
    !isSubmitting &&
    !!resolvedModelId &&
    !!inputPayload &&
    (!session?.user ||
      availableCredits === null ||
      availableCredits >= estimatedCredits) &&
    (!requiresPrompt ||
      (typeof formValues.prompt === "string" && formValues.prompt.trim().length > 0)) &&
    (!requiresImage || hasImageInput(formValues.image_urls));

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
    const prompt =
      typeof formValues.prompt === "string" && formValues.prompt.trim().length > 0
        ? formValues.prompt.trim()
        : mode === "image-to-video"
          ? t("form.imageToVideo")
          : "-";

    setGenerationTasks((current) => [
      {
        localId: localTaskId,
        state: "queued",
        mediaUrls: [],
        mode,
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
    mode,
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
        mode: task.mode,
        familyKey: task.familyKey,
        versionKey: task.versionKey,
        isPublic: task.isPublic,
        payload: task.payload,
      });

      setMode(restored.mode);
      setSelectedFamilyKey(restored.familyKey);
      setSelectedVersionKey(restored.versionKey);
      setIsPublic(restored.isPublic);
      setFormValues(restored.formValues);
      setActiveTaskLocalId(task.localId);
      toast.success(t("form.remixApplied"));
    },
    [t],
  );

  const getFieldLabel = useCallback(
    (field: ReturnType<typeof normalizeAiVideoStudioSchema>["fields"][number]) => {
      switch (field.key) {
        case "prompt":
          return t("form.prompt");
        case "image_urls":
          return t("form.images");
        case "aspect_ratio":
          return t("form.aspectRatio");
        case "n_frames":
          return t("form.duration");
        case "remove_watermark":
          return "Remove watermark";
        case "character_id_list":
          return "Character IDs";
        default:
          return field.label;
      }
    },
    [t],
  );

  const getTaskParamsLine = useCallback(
    (task: GenerationTask) => {
      const parts = [
        task.mode === "image-to-video" ? t("form.imageToVideo") : t("form.textToVideo"),
      ];

      if (typeof task.formValues.aspect_ratio === "string" && task.formValues.aspect_ratio) {
        parts.push(`${t("form.aspectRatio")}: ${task.formValues.aspect_ratio}`);
      }
      if (typeof task.formValues.n_frames === "string" && task.formValues.n_frames) {
        parts.push(`${t("form.duration")}: ${task.formValues.n_frames}s`);
      }

      parts.push(task.isPublic ? t("form.public") : t("form.private"));

      return parts.join(" · ");
    },
    [t],
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
            {supportedModes.length > 0 ? (
              <div className="flex w-full rounded-xl border border-border/50 bg-white dark:bg-zinc-900 p-1 mb-2">
                {supportedModes.map((supportedMode) => (
                  <button
                    key={supportedMode}
                    type="button"
                    onClick={() => setMode(supportedMode)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all",
                      mode === supportedMode
                        ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )}
                  >
                    {supportedMode === "text-to-video" ? (
                      <Type className="w-4 h-4" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                    <span>
                      {supportedMode === "text-to-video"
                        ? t("form.textToVideo")
                        : t("form.imageToVideo")}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

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
                fields={normalizedSchema.fields}
                values={formValues}
                isPublic={isPublic}
                disabled={isSubmitting}
                advancedLabel={t("form.advanced")}
                publicLabel={t("form.public")}
                useUrlLabel={t("form.useUrl")}
                promptPlaceholder={t("form.promptPlaceholder")}
                onChange={(patch) => setFormValues((current) => ({ ...current, ...patch }))}
                onPublicChange={setIsPublic}
                resolveLabel={getFieldLabel}
              />
            ) : null}

            <div className="rounded-xl border border-border/60 bg-background/40 px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{t("form.currentCredits")}</div>
              <div className="text-lg font-semibold text-foreground">
                {!session?.user || isLoadingBenefits
                  ? "--"
                  : t("form.creditsRequired", { count: availableCredits ?? 0 })}
              </div>
            </div>

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
