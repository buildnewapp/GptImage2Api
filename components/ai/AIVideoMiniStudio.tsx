"use client";

import AIVideoMiniStudioTaskHistory from "@/components/ai/AIVideoMiniStudioTaskHistory";
import type { HomeTemplate2Hero } from "@/components/home/template2/types";
import { authClient } from "@/lib/auth/auth-client";
import {
  AI_VIDEO_STUDIO_FAMILIES,
  getAiVideoStudioSelectionFromModelId,
  getAiVideoStudioVersions,
  listAiVideoStudioModelOptions,
  resolveAiVideoStudioModelId,
  type AiVideoStudioFamilyKey,
  type AiVideoStudioVersionKey,
} from "@/config/ai-video-studio";
import {
  AI_VIDEO_STUDIO_FORM_STORAGE_KEY,
  buildAiVideoStudioPayload,
  safeParseAiVideoStudioStoredState,
  serializeAiVideoStudioStoredState,
  type AiVideoStudioFormValues,
} from "@/lib/ai-video-studio/adapter";
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
import { normalizeAiVideoStudioSchema } from "@/lib/ai-video-studio/schema";
import type {
  AiStudioPublicDocDetail,
  AiStudioPublicPricingRow,
} from "@/lib/ai-studio/public";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/routing";
import { ImagePlus, Loader2, Sparkles, X, Zap } from "lucide-react";
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

type ExecuteResponse = {
  success: boolean;
  data: {
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

function getEmptyFieldValue(fieldKey: string, schema: Record<string, any>) {
  if (schema.type === "array") {
    return [];
  }

  if (fieldKey === "prompt") {
    return "";
  }

  return "";
}

function getNormalizedFieldValue(
  fieldKey: string,
  previousValue: unknown,
  schema: Record<string, any>,
  defaultValue: unknown,
) {
  const enumOptions = Array.isArray(schema.enum)
    ? schema.enum.filter((item: unknown): item is string => typeof item === "string")
    : [];
  const hasPreviousArray = Array.isArray(previousValue) && previousValue.length > 0;
  const hasPreviousScalar =
    previousValue !== undefined && previousValue !== null && previousValue !== "";

  if (enumOptions.length > 0) {
    if (typeof previousValue === "string" && enumOptions.includes(previousValue)) {
      return previousValue;
    }

    if (typeof defaultValue === "string" && enumOptions.includes(defaultValue)) {
      return defaultValue;
    }

    return enumOptions[0] ?? getEmptyFieldValue(fieldKey, schema);
  }

  if (hasPreviousArray || hasPreviousScalar) {
    return previousValue;
  }

  if (defaultValue !== undefined) {
    return defaultValue;
  }

  return getEmptyFieldValue(fieldKey, schema);
}

function formatDurationOptionLabel(fieldKey: string, value: string | number) {
  if (fieldKey === "n_frames" || fieldKey === "duration") {
    return `${value}s`;
  }

  return value;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

interface AIVideoMiniStudioProps {
  hero: HomeTemplate2Hero;
  initialModelId?: string | null;
}

const LoginDialog = lazy(() => import("@/components/auth/LoginDialog"));

export default function AIVideoMiniStudio({
  hero,
  initialModelId = null,
}: AIVideoMiniStudioProps) {
  const t = useTranslations("Landing.Hero");
  const router = useRouter();
  const defaultSelection = useMemo(
    () => getDefaultSelection(initialModelId),
    [initialModelId],
  );
  const modelOptions = useMemo(() => listAiVideoStudioModelOptions(), []);
  const { data: session } = authClient.useSession();
  const hasInitializedFromStorageRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollingTimersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

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
  const selectedModelValue = `${selectedFamilyKey}::${selectedVersionKey}`;

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

    setFormValues((previous) => {
      const next: AiVideoStudioFormValues = {};

      for (const field of normalizedSchema.fields) {
        next[field.key] = getNormalizedFieldValue(
          field.key,
          previous[field.key],
          field.schema,
          field.defaultValue,
        );
      }

      return next;
    });
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
        pricingRows: detail?.pricingRows ?? [],
        payload: basePayload,
        pricing: detail?.pricing,
      }),
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
  const showFallbackControls = !normalizedSchema && !detailError;
  const displayedAspectRatioOptions =
    aspectRatioOptions.length > 0 ? aspectRatioOptions : showFallbackControls ? ["16:9"] : [];
  const displayedDurationOptions =
    durationOptions.length > 0
      ? durationOptions
      : showFallbackControls
        ? [hero.durationLabel.replace(/s$/i, "")]
        : [];
  const displayedResolutionOptions =
    resolutionOptions.length > 0
      ? resolutionOptions
      : showFallbackControls
        ? [hero.resolutionLabel]
        : [];
  const currentImagePreview = getImageValue(imageValue);
  const priceLabel =
    estimatedCredits > 0 ? `${estimatedCredits}` : `${hero.creditCost}`;
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
    if (!timer) {
      return;
    }

    clearInterval(timer);
    pollingTimersRef.current.delete(localId);
  }, []);

  useEffect(() => {
    return () => {
      pollingTimersRef.current.forEach((timer) => clearInterval(timer));
      pollingTimersRef.current.clear();
    };
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

          const nextState = resolveAiVideoMiniStudioTaskState(json.data.state);

          if (nextState === "succeeded") {
            clearTaskPolling(localId);
            updateGenerationTask(localId, {
              state: "succeeded",
              mediaUrls: json.data.mediaUrls,
              progress: 100,
            });
            setActiveTaskLocalId(localId);
            toast.success(t("form.generationCompleted"));
            return;
          }

          if (nextState === "failed") {
            clearTaskPolling(localId);
            updateGenerationTask(localId, {
              state: "failed",
              mediaUrls: json.data.mediaUrls,
              progress: 100,
            });
            toast.error(t("form.generationFailed"));
            return;
          }

          updateGenerationTask(localId, {
            state: nextState,
            mediaUrls: json.data.mediaUrls,
          });
          increaseTaskProgress(localId);
        } catch {
          increaseTaskProgress(localId);
        }
      }, 5000);

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

      try {
        setIsUploadingImage(true);
        const dataUrl = await readFileAsDataUrl(file);
        const nextValue =
          primaryFields.imageField?.schema.type === "array" ? [dataUrl] : dataUrl;
        updateFormValue(primaryFields.imageField?.key ?? "image_urls", nextValue);
      } catch {
        toast.error(t("form.uploadFailed"));
      } finally {
        setIsUploadingImage(false);
        event.target.value = "";
      }
    },
    [primaryFields.imageField, t, updateFormValue],
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

      const nextState = resolveAiVideoMiniStudioTaskState(json.data.state);

      updateGenerationTask(localTask.localId, {
        taskId: json.data.taskId ?? undefined,
        state: nextState,
        mediaUrls: json.data.mediaUrls ?? [],
        creditsRequired: json.data.reservedCredits ?? estimatedCredits,
        progress:
          nextState === "succeeded" || nextState === "failed" || !json.data.taskId
            ? 100
            : 10,
      });

      if (nextState === "failed") {
        toast.error(t("form.generationFailed"));
        return;
      }

      if (nextState === "succeeded" || !json.data.taskId) {
        toast.success(t("form.generationSuccess"));
      } else {
        toast.success(t("form.generationQueued"));
        pollStatus(localTask.localId, json.data.taskId, resolvedModelId);
      }
    } catch (error: any) {
      updateGenerationTask(localTask.localId, {
        state: "failed",
        progress: 100,
      });
      toast.error(error?.message || t("form.generationFailed"));
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
      className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.06] shadow-[0_28px_60px_-36px_rgba(2,8,23,0.65)] backdrop-blur-xl"
    >
      <div className="px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-6">
        <div className="flex gap-4">
          <div className="shrink-0">
            <button
              data-ai-video-mini-studio-upload
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.35rem] border border-white/12 bg-white/[0.05] text-white/70 transition hover:border-white/20 hover:bg-white/[0.08] sm:h-28 sm:w-28"
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
                placeholder={hero.placeholder}
              />
              {detailError ? (
                <p className="mt-2 text-xs text-amber-200/80">{detailError}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 border-t border-white/8 px-5 py-3.5 sm:px-7">
        <label data-ai-video-mini-studio-model className="min-w-0">
          <select
            value={selectedModelValue}
            onChange={(event) => {
              const [familyKey, versionKey] = event.target.value.split("::");
              setSelectedFamilyKey(familyKey);
              setSelectedVersionKey(versionKey);
            }}
            className="flex h-9 w-[120px] items-center rounded-full border border-white/12 bg-white/6 px-2 py-2 text-[12px] font-medium text-white/80 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] outline-none transition hover:border-white/20"
          >
            {modelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {displayedAspectRatioOptions.length > 0 ? (
          <label data-ai-video-mini-studio-aspect-ratio className="min-w-0">
            <select
              value={String(
                formValues[primaryFields.aspectRatioField?.key ?? "aspect_ratio"] ??
                  displayedAspectRatioOptions[0],
              )}
              onChange={(event) =>
                updateFormValue(
                  primaryFields.aspectRatioField?.key ?? "aspect_ratio",
                  coerceAiVideoMiniStudioFieldValue(
                    primaryFields.aspectRatioField,
                    event.target.value,
                  ),
                )
              }
              className="flex h-9 w-[65px] items-center rounded-full border border-white/12 bg-white/6 px-2 py-2 text-[12px] font-medium text-white/80 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] outline-none transition hover:border-white/20"
            >
              {displayedAspectRatioOptions.map((option) => (
                <option key={String(option)} value={String(option)}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {displayedDurationOptions.length > 0 ? (
          <label data-ai-video-mini-studio-duration className="min-w-0">
            <select
              value={String(
                formValues[primaryFields.durationField?.key ?? "duration"] ??
                  displayedDurationOptions[0],
              )}
              onChange={(event) =>
                updateFormValue(
                  primaryFields.durationField?.key ?? "duration",
                  coerceAiVideoMiniStudioFieldValue(
                    primaryFields.durationField,
                    event.target.value,
                  ),
                )
              }
              className="flex h-9 w-[60px] items-center rounded-full border border-white/12 bg-white/6 px-2 py-2 text-[12px] font-medium text-white/80 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] outline-none transition hover:border-white/20"
            >
              {displayedDurationOptions.map((option) => (
                <option key={String(option)} value={String(option)}>
                  {formatDurationOptionLabel(
                    primaryFields.durationField?.key ?? "duration",
                    option,
                  )}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {displayedResolutionOptions.length > 0 ? (
          <label data-ai-video-mini-studio-resolution className="min-w-0">
            <select
              value={String(
                formValues[primaryFields.resolutionField?.key ?? "resolution"] ??
                  displayedResolutionOptions[0],
              )}
              onChange={(event) =>
                updateFormValue(
                  primaryFields.resolutionField?.key ?? "resolution",
                  coerceAiVideoMiniStudioFieldValue(
                    primaryFields.resolutionField,
                    event.target.value,
                  ),
                )
              }
              className="flex h-9 w-[70px] items-center rounded-full border border-white/12 bg-white/6 px-2 py-2 text-[12px] font-medium text-white/80 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.03)] outline-none transition hover:border-white/20"
            >
              {displayedResolutionOptions.map((option) => (
                <option key={String(option)} value={String(option)}>
                  {option}
                </option>
              ))}
            </select>
          </label>
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
            {isSubmitting ? t("form.generating") : hero.ctaLabel}
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
